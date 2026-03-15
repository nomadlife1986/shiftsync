import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';

export interface GetOnDutyNowInput {
  locationId?: string;
}

export interface OnDutyEntry {
  userId: string;
  firstName: string;
  lastName: string;
  shiftId: string;
  startTime: Date;
  endTime: Date;
  requiredSkill: string;
  locationId: string;
}

@Injectable()
export class GetOnDutyNowUseCase implements IUseCase<GetOnDutyNowInput, OnDutyEntry[]> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: GetOnDutyNowInput): Promise<OnDutyEntry[]> {
    const now = new Date();
    const shifts = await this.shiftRepo.findByDateRange(now, now, input.locationId);

    if (shifts.length === 0) return [];

    const shiftIds = shifts.map((s) => s.id);
    const allAssignments = await this.assignmentRepo.findByShiftIds(shiftIds);
    const activeAssignments = allAssignments.filter((a) => a.isActive());

    const userIds = [...new Set(activeAssignments.map((a) => a.userId))];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    const entries: OnDutyEntry[] = [];
    for (const assignment of activeAssignments) {
      const user = userMap.get(assignment.userId);
      const shift = shiftMap.get(assignment.shiftId);
      if (user && shift) {
        entries.push({
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          shiftId: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          requiredSkill: shift.requiredSkill,
          locationId: shift.locationId,
        });
      }
    }

    return entries;
  }
}
