import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { ILocationRepository, LOCATION_REPOSITORY } from '../../domain/location/repositories/location.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { SchedulingConstraintService, ConstraintViolation, StaffSuggestion } from '../../domain/scheduling/services/scheduling-constraint.domain-service';
import { OvertimeCalculatorService, OvertimeWarning } from '../../domain/compliance/services/overtime-calculator.domain-service';
import { AssignmentEntity } from '../../domain/scheduling/entities/assignment.entity';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { StaffAssignedEvent } from '../../domain/scheduling/events/staff-assigned.event';
import { randomUUID } from 'crypto';

export interface AssignStaffInput {
  shiftId: string;
  userId: string;
  assignedBy: string;
}

export interface AssignmentResult {
  success: boolean;
  assignmentId?: string;
  violations?: ConstraintViolation[];
  overtimeWarnings?: OvertimeWarning[];
  suggestions?: StaffSuggestion[];
}

@Injectable()
export class AssignStaffUseCase implements IUseCase<AssignStaffInput, AssignmentResult> {
  private constraintService = new SchedulingConstraintService();
  private overtimeCalculator = new OvertimeCalculatorService();

  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(EVENT_STORE_REPOSITORY) private readonly eventStore: IEventStoreRepository,
    @Inject(LOCATION_REPOSITORY) private readonly locationRepo: ILocationRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
  ) {}

  async execute(input: AssignStaffInput): Promise<AssignmentResult> {
    // 1. Load shift + user from repos
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new NotFoundException('User not found');

    const location = await this.locationRepo.findById(shift.locationId);
    if (!location) throw new NotFoundException('Location not found');

    // 2. Load user's existing assignments for the week
    const weekStart = shift.scheduleWeek ?? this.getWeekStart(shift.startTime);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const userWeekAssignments = await this.assignmentRepo.findByUserId(input.userId, {
      start: weekStart,
      end: weekEnd,
    });

    // 3. Load shift's existing assignments
    const shiftAssignments = await this.assignmentRepo.findByShiftId(input.shiftId);

    // Load all shifts the user is assigned to for the week
    const userShiftIds = userWeekAssignments.map((a) => a.shiftId);
    const allUserShifts = userShiftIds.length > 0
      ? await this.shiftRepo.findByIds([...userShiftIds, shift.id])
      : [shift];

    // 4. Run SchedulingConstraintService.validate()
    const validationResult = this.constraintService.validate({
      shift,
      user,
      existingUserAssignments: userWeekAssignments,
      existingShiftAssignments: shiftAssignments,
      allShiftsForUser: allUserShifts,
      locationTimezone: location.timezone,
    });

    // 5. If violations, suggest alternatives
    if (validationResult.isFailure) {
      const violations = validationResult.error;
      const availableStaff = await this.userRepo.findStaffByLocationAndSkill(
        shift.locationId,
        shift.requiredSkill,
      );
      const allAssignments = await this.assignmentRepo.findByUserAndWeek(
        input.userId,
        weekStart,
      );
      const allShifts = await this.shiftRepo.findByWeekAndLocation(weekStart, shift.locationId);

      const suggestions = this.constraintService.suggestAlternatives(
        shift,
        availableStaff.filter((s) => s.id !== input.userId),
        allAssignments,
        allShifts,
        location.timezone,
      );

      return { success: false, violations, suggestions };
    }

    // 6. Run OvertimeCalculatorService.calculate() for warnings
    const shiftTimes = allUserShifts
      .filter((s) => userWeekAssignments.some((a) => a.shiftId === s.id && a.isActive()))
      .map((s) => ({
        shiftId: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    // Include the new shift being assigned
    shiftTimes.push({
      shiftId: shift.id,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });

    const overtimeResult = this.overtimeCalculator.calculate({
      assignments: shiftTimes,
      weekStart,
    });

    // Check if there are blocking overtime issues
    if (overtimeResult.blocks.length > 0) {
      return {
        success: false,
        violations: overtimeResult.blocks.map((b) => ({
          type: b.type,
          message: b.message,
          severity: 'error',
        })),
        overtimeWarnings: overtimeResult.warnings,
      };
    }

    // 7. Create AssignmentEntity, save to repo
    const assignmentId = randomUUID();
    const assignment = AssignmentEntity.create(
      {
        shiftId: input.shiftId,
        userId: input.userId,
        status: 'ASSIGNED',
        assignedBy: input.assignedBy,
        assignedAt: new Date(),
      },
      assignmentId,
    );

    await this.assignmentRepo.save(assignment);

    // 8. Emit StaffAssigned event to event store
    const event = new StaffAssignedEvent(input.shiftId, input.userId, input.assignedBy);
    const version = await this.eventStore.getNextVersion(input.shiftId);
    await this.eventStore.append([
      {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        version,
        payload: event.payload,
        metadata: { userId: input.assignedBy, occurredAt: event.occurredAt.toISOString() },
        occurredAt: event.occurredAt,
      },
    ]);

    // 9. Send notification
    const notification = NotificationEntity.create(
      {
        userId: input.userId,
        type: 'SHIFT_ASSIGNED',
        title: 'New Shift Assignment',
        message: `You have been assigned to a shift on ${shift.startTime.toLocaleDateString()}`,
        data: { shiftId: shift.id, locationId: shift.locationId },
        isRead: false,
        createdAt: new Date(),
      },
      randomUUID(),
    );
    await this.notificationRepo.save(notification);
    this.realtimeService.emitNotification(input.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
    });
    this.realtimeService.emitScheduleUpdate(
      shift.locationId,
      weekStart.toISOString().split('T')[0]!,
    );

    // 10. Return AssignmentResult
    return {
      success: true,
      assignmentId: assignment.id,
      overtimeWarnings: overtimeResult.warnings.length > 0 ? overtimeResult.warnings : undefined,
    };
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
