import { Result } from '../../common/result';
import { UserEntity } from '../../user/entities/user.entity';
import { ShiftEntity } from '../../scheduling/entities/shift.entity';

export interface CoverageViolation {
  type: string;
  message: string;
}

const MAX_PENDING_REQUESTS = 3;

export class CoverageEligibilityService {
  canRequestSwap(
    user: UserEntity,
    shift: ShiftEntity,
    pendingCount: number,
  ): Result<void, CoverageViolation> {
    if (pendingCount >= MAX_PENDING_REQUESTS) {
      return Result.fail({
        type: 'MAX_PENDING_EXCEEDED',
        message: `Maximum ${MAX_PENDING_REQUESTS} pending swap/drop requests allowed`,
      });
    }
    if (!shift.canEdit()) {
      return Result.fail({
        type: 'PAST_CUTOFF',
        message: 'Cannot request swap after edit cutoff',
      });
    }
    return Result.ok(undefined);
  }

  canRequestDrop(
    user: UserEntity,
    shift: ShiftEntity,
    pendingCount: number,
  ): Result<void, CoverageViolation> {
    if (pendingCount >= MAX_PENDING_REQUESTS) {
      return Result.fail({
        type: 'MAX_PENDING_EXCEEDED',
        message: `Maximum ${MAX_PENDING_REQUESTS} pending swap/drop requests allowed`,
      });
    }
    const expiresAt = new Date(shift.startTime.getTime() - 24 * 60 * 60 * 1000);
    if (new Date() >= expiresAt) {
      return Result.fail({
        type: 'TOO_LATE',
        message: 'Cannot request drop within 24 hours of shift start',
      });
    }
    return Result.ok(undefined);
  }

  canPickupDrop(
    user: UserEntity,
    shift: ShiftEntity,
  ): Result<void, CoverageViolation> {
    if (!user.hasSkill(shift.requiredSkill)) {
      return Result.fail({
        type: 'SKILL_MISMATCH',
        message: `You don't have the "${shift.requiredSkill}" skill required for this shift`,
      });
    }
    if (!user.isCertifiedAt(shift.locationId)) {
      return Result.fail({
        type: 'NOT_CERTIFIED',
        message: 'You are not certified to work at this location',
      });
    }
    return Result.ok(undefined);
  }
}
