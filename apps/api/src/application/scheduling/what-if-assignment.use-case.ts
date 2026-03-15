import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { ILocationRepository, LOCATION_REPOSITORY } from '../../domain/location/repositories/location.repository.interface';
import { SchedulingConstraintService, ConstraintViolation, StaffSuggestion } from '../../domain/scheduling/services/scheduling-constraint.domain-service';
import { OvertimeCalculatorService, OvertimeWarning } from '../../domain/compliance/services/overtime-calculator.domain-service';

export interface WhatIfInput {
  shiftId: string;
  userId: string;
}

export interface WhatIfOutput {
  canAssign: boolean;
  violations: ConstraintViolation[];
  overtimeWarnings: OvertimeWarning[];
  suggestions: StaffSuggestion[];
  projectedWeeklyHours: number;
  projectedOvertimeHours: number;
}

@Injectable()
export class WhatIfAssignmentUseCase implements IUseCase<WhatIfInput, WhatIfOutput> {
  private constraintService = new SchedulingConstraintService();
  private overtimeCalculator = new OvertimeCalculatorService();

  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(LOCATION_REPOSITORY) private readonly locationRepo: ILocationRepository,
  ) {}

  async execute(input: WhatIfInput): Promise<WhatIfOutput> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new NotFoundException('User not found');

    const location = await this.locationRepo.findById(shift.locationId);
    if (!location) throw new NotFoundException('Location not found');

    const weekStart = shift.scheduleWeek ?? this.getWeekStart(shift.startTime);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const userWeekAssignments = await this.assignmentRepo.findByUserId(input.userId, {
      start: weekStart,
      end: weekEnd,
    });
    const shiftAssignments = await this.assignmentRepo.findByShiftId(input.shiftId);

    const userShiftIds = userWeekAssignments.map((a) => a.shiftId);
    const allUserShifts = userShiftIds.length > 0
      ? await this.shiftRepo.findByIds([...userShiftIds, shift.id])
      : [shift];

    // Run constraint validation
    const validationResult = this.constraintService.validate({
      shift,
      user,
      existingUserAssignments: userWeekAssignments,
      existingShiftAssignments: shiftAssignments,
      allShiftsForUser: allUserShifts,
      locationTimezone: location.timezone,
    });

    const violations = validationResult.isFailure ? validationResult.error : validationResult.value;

    // Run overtime check including proposed assignment
    const shiftTimes = allUserShifts
      .filter((s) => userWeekAssignments.some((a) => a.shiftId === s.id && a.isActive()))
      .map((s) => ({ shiftId: s.id, startTime: s.startTime, endTime: s.endTime }));
    shiftTimes.push({ shiftId: shift.id, startTime: shift.startTime, endTime: shift.endTime });

    const overtimeResult = this.overtimeCalculator.calculate({ assignments: shiftTimes, weekStart });

    // Get suggestions if there are violations
    let suggestions: StaffSuggestion[] = [];
    if (violations.length > 0) {
      const availableStaff = await this.userRepo.findStaffByLocationAndSkill(
        shift.locationId,
        shift.requiredSkill,
      );
      const allAssignments = await this.assignmentRepo.findByUserAndWeek(input.userId, weekStart);
      const allShifts = await this.shiftRepo.findByWeekAndLocation(weekStart, shift.locationId);

      suggestions = this.constraintService.suggestAlternatives(
        shift,
        availableStaff.filter((s) => s.id !== input.userId),
        allAssignments,
        allShifts,
        location.timezone,
      );
    }

    return {
      canAssign: violations.length === 0 && overtimeResult.blocks.length === 0,
      violations,
      overtimeWarnings: [...overtimeResult.warnings, ...overtimeResult.blocks],
      suggestions,
      projectedWeeklyHours: overtimeResult.totalWeeklyHours,
      projectedOvertimeHours: overtimeResult.overtimeHours,
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
