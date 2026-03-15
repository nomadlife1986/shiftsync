import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/gql-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ShiftType, WeekScheduleType, AssignmentType, DomainEventType } from '../types/shift.type';
import { AssignmentResultType, WhatIfResultType } from '../types/common.type';
import { CreateShiftInput, UpdateShiftInput } from '../inputs/create-shift.input';
import { CreateShiftUseCase } from '../../../application/scheduling/create-shift.use-case';
import { UpdateShiftUseCase } from '../../../application/scheduling/update-shift.use-case';
import { DeleteShiftUseCase } from '../../../application/scheduling/delete-shift.use-case';
import { AssignStaffUseCase } from '../../../application/scheduling/assign-staff.use-case';
import { UnassignStaffUseCase } from '../../../application/scheduling/unassign-staff.use-case';
import { WhatIfAssignmentUseCase } from '../../../application/scheduling/what-if-assignment.use-case';
import { GetWeekScheduleUseCase } from '../../../application/scheduling/get-week-schedule.use-case';
import { PublishScheduleUseCase } from '../../../application/scheduling/publish-schedule.use-case';
import { UnpublishScheduleUseCase } from '../../../application/scheduling/unpublish-schedule.use-case';
import { GetShiftHistoryUseCase } from '../../../application/audit/get-shift-history.use-case';
import { ShiftEntity } from '../../../domain/scheduling/entities/shift.entity';
import { AssignmentEntity } from '../../../domain/scheduling/entities/assignment.entity';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../domain/scheduling/repositories/assignment.repository.interface';

@Resolver(() => ShiftType)
@UseGuards(JwtAuthGuard)
export class ShiftResolver {
  constructor(
    private createShiftUc: CreateShiftUseCase,
    private updateShiftUc: UpdateShiftUseCase,
    private deleteShiftUc: DeleteShiftUseCase,
    private assignStaffUc: AssignStaffUseCase,
    private unassignStaffUc: UnassignStaffUseCase,
    private whatIfAssignmentUc: WhatIfAssignmentUseCase,
    private getWeekSchedule: GetWeekScheduleUseCase,
    private publishScheduleUc: PublishScheduleUseCase,
    private unpublishScheduleUc: UnpublishScheduleUseCase,
    private getShiftHistory: GetShiftHistoryUseCase,
    @Inject(SHIFT_REPOSITORY) private shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private assignmentRepo: IAssignmentRepository,
  ) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  @Query(() => WeekScheduleType)
  async weekSchedule(
    @Args('locationId', { type: () => ID }) locationId: string,
    @Args('week') week: Date,
  ): Promise<WeekScheduleType> {
    const result = await this.getWeekSchedule.execute({ locationId, weekStart: week });
    return {
      locationId,
      week,
      shifts: result.shifts.map(swa =>
        this.toShiftType(swa.shift, swa.assignments.map(a => this.toAssignmentType(a.assignment))),
      ),
    };
  }

  @Query(() => ShiftType)
  async shift(@Args('id', { type: () => ID }) id: string): Promise<ShiftType> {
    const s = await this.shiftRepo.findById(id);
    if (!s) throw new Error('Shift not found');
    const assignments = await this.assignmentRepo.findByShiftId(id);
    return this.toShiftType(s, assignments.map(a => this.toAssignmentType(a)));
  }

  @Query(() => [DomainEventType])
  async shiftHistory(@Args('shiftId', { type: () => ID }) shiftId: string): Promise<DomainEventType[]> {
    const events = await this.getShiftHistory.execute({ shiftId });
    return events.map(e => ({
      id: e.id ?? '',
      aggregateId: e.aggregateId,
      aggregateType: e.aggregateType,
      eventType: e.eventType,
      version: e.version,
      occurredAt: e.occurredAt,
    }));
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  @Mutation(() => ShiftType)
  async createShift(
    @Args('input') input: CreateShiftInput,
    @CurrentUser() user: { id: string },
  ): Promise<ShiftType> {
    const shift = await this.createShiftUc.execute({ ...input, createdBy: user.id });
    return this.toShiftType(shift);
  }

  @Mutation(() => ShiftType)
  async updateShift(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateShiftInput,
    @CurrentUser() user: { id: string },
  ): Promise<ShiftType> {
    const shift = await this.updateShiftUc.execute({ id, ...input, requestedBy: user.id });
    return this.toShiftType(shift);
  }

  @Mutation(() => Boolean)
  async deleteShift(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<boolean> {
    return this.deleteShiftUc.execute({ id, requestedBy: user.id });
  }

  @Mutation(() => AssignmentResultType)
  async assignStaff(
    @Args('shiftId', { type: () => ID }) shiftId: string,
    @Args('userId', { type: () => ID }) userId: string,
    @CurrentUser() user: { id: string },
  ): Promise<AssignmentResultType> {
    const result = await this.assignStaffUc.execute({ shiftId, userId, assignedBy: user.id });
    return {
      success: result.success,
      assignmentId: result.assignmentId,
      violations: (result.violations ?? []).map(v => ({ type: v.type, message: v.message })),
      overtimeWarnings: (result.overtimeWarnings ?? []).map(w => ({ type: w.type, message: w.message })),
      suggestions: (result.suggestions ?? []).map(s => ({
        userId: s.userId,
        firstName: s.firstName,
        lastName: s.lastName,
        matchScore: s.matchScore,
        warnings: s.warnings,
      })),
    };
  }

  @Mutation(() => Boolean)
  async unassignStaff(
    @Args('shiftId', { type: () => ID }) shiftId: string,
    @Args('userId', { type: () => ID }) userId: string,
    @CurrentUser() user: { id: string },
  ): Promise<boolean> {
    return this.unassignStaffUc.execute({ shiftId, userId, requestedBy: user.id });
  }

  @Mutation(() => WhatIfResultType)
  async whatIfAssignment(
    @Args('shiftId', { type: () => ID }) shiftId: string,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<WhatIfResultType> {
    const result = await this.whatIfAssignmentUc.execute({ shiftId, userId });
    return {
      canAssign: result.canAssign,
      violations: (result.violations ?? []).map(v => ({ type: v.type, message: v.message })),
      warnings: (result.overtimeWarnings ?? []).map(w => ({ type: w.type, message: w.message })),
      projectedWeeklyHours: result.projectedWeeklyHours ?? 0,
    };
  }

  @Mutation(() => Boolean)
  async publishSchedule(
    @Args('locationId', { type: () => ID }) locationId: string,
    @Args('week') week: Date,
    @CurrentUser() user: { id: string },
  ): Promise<boolean> {
    await this.publishScheduleUc.execute({ locationId, weekStart: week, publishedBy: user.id });
    return true;
  }

  @Mutation(() => Boolean)
  async unpublishSchedule(
    @Args('locationId', { type: () => ID }) locationId: string,
    @Args('week') week: Date,
    @CurrentUser() user: { id: string },
  ): Promise<boolean> {
    return this.unpublishScheduleUc.execute({ locationId, week, requestedBy: user.id });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private toShiftType(shift: ShiftEntity, assignments: AssignmentType[] = []): ShiftType {
    return {
      id: shift.id,
      locationId: shift.locationId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredSkill: shift.requiredSkill,
      headcount: shift.headcount,
      status: shift.status,
      scheduleWeek: shift.scheduleWeek ?? undefined,
      publishedAt: shift.publishedAt ?? undefined,
      editCutoffHours: shift.editCutoffHours,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
      assignments,
    };
  }

  private toAssignmentType(a: AssignmentEntity): AssignmentType {
    return {
      id: a.id,
      shiftId: a.shiftId,
      userId: a.userId,
      status: a.status,
      assignedBy: a.assignedBy,
      createdAt: a.createdAt,
    };
  }
}
