import { Result } from '../../common/result';
import { UserEntity } from '../../user/entities/user.entity';
import { ShiftEntity } from '../entities/shift.entity';
import { AssignmentEntity } from '../entities/assignment.entity';
import { UserAvailabilityDomainService } from '../../user/services/user-availability.domain-service';

export interface ConstraintViolation {
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface StaffSuggestion {
  userId: string;
  firstName: string;
  lastName: string;
  matchScore: number;
  warnings: string[];
}

export class SchedulingConstraintService {
  private availabilityService = new UserAvailabilityDomainService();

  validate(params: {
    shift: ShiftEntity;
    user: UserEntity;
    existingUserAssignments: AssignmentEntity[];
    existingShiftAssignments: AssignmentEntity[];
    allShiftsForUser: ShiftEntity[];
    locationTimezone: string;
  }): Result<void, ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];
    const { shift, user, existingUserAssignments, existingShiftAssignments, allShiftsForUser, locationTimezone } = params;

    // 1. Skill match
    if (!user.hasSkill(shift.requiredSkill)) {
      violations.push({
        type: 'SKILL_MISMATCH',
        message: `${user.fullName} does not have the "${shift.requiredSkill}" skill. Their skills: ${user.skills.join(', ')}`,
        details: { requiredSkill: shift.requiredSkill, userSkills: user.skills },
      });
    }

    // 2. Location certification
    if (!user.isCertifiedAt(shift.locationId)) {
      violations.push({
        type: 'LOCATION_NOT_CERTIFIED',
        message: `${user.fullName} is not certified to work at this location`,
        details: { locationId: shift.locationId },
      });
    }

    // 3. Headcount check
    const activeAssignments = existingShiftAssignments.filter((a) => a.isActive());
    if (activeAssignments.length >= shift.headcount) {
      violations.push({
        type: 'HEADCOUNT_EXCEEDED',
        message: `Shift is already at full capacity (${shift.headcount} staff)`,
        details: { headcount: shift.headcount, current: activeAssignments.length },
      });
    }

    // 4. Double-booking check (overlapping shifts across locations)
    for (const existingAssignment of existingUserAssignments) {
      if (!existingAssignment.isActive()) continue;
      const existingShift = allShiftsForUser.find((s) => s.id === existingAssignment.shiftId);
      if (!existingShift) continue;
      if (existingShift.id === shift.id) continue;

      if (this.shiftsOverlap(shift, existingShift)) {
        violations.push({
          type: 'DOUBLE_BOOKING',
          message: `${user.fullName} is already assigned to an overlapping shift (${existingShift.startTime.toISOString()} - ${existingShift.endTime.toISOString()})`,
          details: { conflictingShiftId: existingShift.id },
        });
        break;
      }
    }

    // 5. Minimum rest period (10 hours between shifts)
    for (const existingAssignment of existingUserAssignments) {
      if (!existingAssignment.isActive()) continue;
      const existingShift = allShiftsForUser.find((s) => s.id === existingAssignment.shiftId);
      if (!existingShift || existingShift.id === shift.id) continue;

      const restHours = this.getRestHours(shift, existingShift);
      if (restHours !== null && restHours < 10) {
        violations.push({
          type: 'INSUFFICIENT_REST',
          message: `Only ${restHours.toFixed(1)} hours of rest between shifts (minimum 10 required)`,
          details: { restHours, conflictingShiftId: existingShift.id },
        });
        break;
      }
    }

    // 6. Availability check
    if (!this.availabilityService.isAvailableAt(user, shift.startTime, shift.endTime, locationTimezone)) {
      violations.push({
        type: 'UNAVAILABLE',
        message: `${user.fullName} is not available during this shift time`,
        details: { shiftStart: shift.startTime, shiftEnd: shift.endTime },
      });
    }

    // 7. Edit cutoff check
    if (shift.isPublished() && !shift.canEdit()) {
      violations.push({
        type: 'EDIT_CUTOFF_PASSED',
        message: `Shift is published and past the ${shift.editCutoffHours}-hour edit cutoff`,
        details: { editCutoffHours: shift.editCutoffHours },
      });
    }

    return violations.length > 0
      ? Result.fail(violations)
      : Result.ok(undefined);
  }

  suggestAlternatives(
    shift: ShiftEntity,
    availableStaff: UserEntity[],
    existingAssignments: AssignmentEntity[],
    allShifts: ShiftEntity[],
    locationTimezone: string,
  ): StaffSuggestion[] {
    const suggestions: StaffSuggestion[] = [];

    for (const staff of availableStaff) {
      const userAssignments = existingAssignments.filter((a) => a.userId === staff.id);
      const userShifts = allShifts.filter((s) =>
        userAssignments.some((a) => a.shiftId === s.id),
      );

      const result = this.validate({
        shift,
        user: staff,
        existingUserAssignments: userAssignments,
        existingShiftAssignments: existingAssignments.filter((a) => a.shiftId === shift.id),
        allShiftsForUser: userShifts,
        locationTimezone,
      });

      if (result.isSuccess) {
        const warnings: string[] = [];
        // Calculate match score based on factors
        let score = 100;
        // Prefer staff not approaching overtime
        const weeklyHours = this.calculateWeeklyHours(userAssignments, allShifts);
        if (weeklyHours > 35) {
          score -= 20;
          warnings.push(`Already at ${weeklyHours.toFixed(1)} hours this week`);
        }
        if (weeklyHours > 30) score -= 10;

        suggestions.push({
          userId: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          matchScore: Math.max(0, score),
          warnings,
        });
      }
    }

    return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  private shiftsOverlap(a: ShiftEntity, b: ShiftEntity): boolean {
    return a.startTime < b.endTime && b.startTime < a.endTime;
  }

  private getRestHours(a: ShiftEntity, b: ShiftEntity): number | null {
    if (this.shiftsOverlap(a, b)) return 0;
    const gap1 = (a.startTime.getTime() - b.endTime.getTime()) / (1000 * 60 * 60);
    const gap2 = (b.startTime.getTime() - a.endTime.getTime()) / (1000 * 60 * 60);
    const gap = Math.min(Math.abs(gap1), Math.abs(gap2));
    if (gap1 > 0 || gap2 > 0) return Math.max(gap1, gap2);
    return null;
  }

  private calculateWeeklyHours(assignments: AssignmentEntity[], shifts: ShiftEntity[]): number {
    let total = 0;
    for (const a of assignments) {
      if (!a.isActive()) continue;
      const shift = shifts.find((s) => s.id === a.shiftId);
      if (shift) total += shift.getDurationHours();
    }
    return total;
  }
}
