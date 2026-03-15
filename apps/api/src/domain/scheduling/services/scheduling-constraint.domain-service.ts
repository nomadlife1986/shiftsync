import { Result } from '../../common/result';
import { UserEntity } from '../../user/entities/user.entity';
import { ShiftEntity } from '../entities/shift.entity';
import { AssignmentEntity } from '../entities/assignment.entity';
import { UserAvailabilityDomainService } from '../../user/services/user-availability.domain-service';

export interface ConstraintViolation {
  type: string;
  message: string;
  /** 'error' = blocks assignment; 'warning' = informational, manager can proceed */
  severity: 'error' | 'warning';
  details?: Record<string, unknown>;
}

export interface StaffSuggestion {
  userId: string;
  firstName: string;
  lastName: string;
  matchScore: number;
  warnings: string[];
}

/** Format a Date to a readable string like "Mon Mar 13, 5:00 PM" */
function fmtTime(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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

    // 1. Skill match — warning only (manager may know better)
    if (!user.hasSkill(shift.requiredSkill)) {
      violations.push({
        type: 'SKILL_MISMATCH',
        severity: 'warning',
        message: `${user.fullName} does not have the "${shift.requiredSkill}" skill (their skills: ${user.skills.join(', ') || 'none'})`,
        details: { requiredSkill: shift.requiredSkill, userSkills: user.skills },
      });
    }

    // 2. Location certification — hard error
    if (!user.isCertifiedAt(shift.locationId)) {
      violations.push({
        type: 'LOCATION_NOT_CERTIFIED',
        severity: 'error',
        message: `${user.fullName} is not certified to work at this location`,
        details: { locationId: shift.locationId },
      });
    }

    // 3. Headcount — hard error
    const activeAssignments = existingShiftAssignments.filter((a) => a.isActive());
    if (activeAssignments.length >= shift.headcount) {
      violations.push({
        type: 'HEADCOUNT_EXCEEDED',
        severity: 'error',
        message: `Shift is already at full capacity (${activeAssignments.length}/${shift.headcount} staff)`,
        details: { headcount: shift.headcount, current: activeAssignments.length },
      });
    }

    // 4. Double-booking — hard error (can't be in two places at once)
    for (const existingAssignment of existingUserAssignments) {
      if (!existingAssignment.isActive()) continue;
      const existingShift = allShiftsForUser.find((s) => s.id === existingAssignment.shiftId);
      if (!existingShift || existingShift.id === shift.id) continue;

      if (this.shiftsOverlap(shift, existingShift)) {
        violations.push({
          type: 'DOUBLE_BOOKING',
          severity: 'error',
          message: `${user.fullName} is already assigned to an overlapping shift (${fmtTime(existingShift.startTime)} – ${fmtTime(existingShift.endTime)})`,
          details: { conflictingShiftId: existingShift.id },
        });
        break;
      }
    }

    // 5. Minimum rest — warning only (manager decides)
    for (const existingAssignment of existingUserAssignments) {
      if (!existingAssignment.isActive()) continue;
      const existingShift = allShiftsForUser.find((s) => s.id === existingAssignment.shiftId);
      if (!existingShift || existingShift.id === shift.id) continue;

      const restHours = this.getRestHours(shift, existingShift);
      if (restHours !== null && restHours < 10) {
        violations.push({
          type: 'INSUFFICIENT_REST',
          severity: 'warning',
          message: `Only ${restHours.toFixed(1)}h of rest near another shift (minimum 10h recommended)`,
          details: { restHours, conflictingShiftId: existingShift.id },
        });
        break;
      }
    }

    // 6. Availability — warning only (manager can override)
    if (!this.availabilityService.isAvailableAt(user, shift.startTime, shift.endTime, locationTimezone)) {
      violations.push({
        type: 'UNAVAILABLE',
        severity: 'warning',
        message: `${user.fullName} has not marked themselves available during this shift`,
        details: { shiftStart: shift.startTime, shiftEnd: shift.endTime },
      });
    }

    // NOTE: EDIT_CUTOFF_PASSED is intentionally NOT checked here.
    // Managers can assign staff regardless of the edit cutoff window.

    // Only hard ('error') violations block the assignment.
    // On failure we pass ALL violations (errors + warnings) so the client can show everything.
    const hardViolations = violations.filter((v) => v.severity === 'error');
    return hardViolations.length > 0
      ? Result.fail(violations)
      : Result.ok(violations); // ok carries soft warnings so callers can surface them
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
        let score = 100;
        const weeklyHours = this.calculateWeeklyHours(userAssignments, allShifts);
        if (weeklyHours > 35) { score -= 20; warnings.push(`Already at ${weeklyHours.toFixed(1)}h this week`); }
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
