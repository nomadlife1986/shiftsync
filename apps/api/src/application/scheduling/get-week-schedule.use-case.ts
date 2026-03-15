import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { ShiftEntity } from '../../domain/scheduling/entities/shift.entity';
import { AssignmentEntity } from '../../domain/scheduling/entities/assignment.entity';
import { UserEntity } from '../../domain/user/entities/user.entity';

export interface GetWeekScheduleInput {
  locationId: string;
  weekStart: Date;
}

export interface ShiftWithAssignments {
  shift: ShiftEntity;
  assignments: Array<{
    assignment: AssignmentEntity;
    user: UserEntity;
  }>;
}

export interface WeekScheduleOutput {
  locationId: string;
  weekStart: Date;
  shifts: ShiftWithAssignments[];
}

@Injectable()
export class GetWeekScheduleUseCase implements IUseCase<GetWeekScheduleInput, WeekScheduleOutput> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: GetWeekScheduleInput): Promise<WeekScheduleOutput> {
    const shifts = await this.shiftRepo.findByWeekAndLocation(input.weekStart, input.locationId);

    if (shifts.length === 0) {
      return { locationId: input.locationId, weekStart: input.weekStart, shifts: [] };
    }

    const shiftIds = shifts.map((s) => s.id);
    const allAssignments = await this.assignmentRepo.findByShiftIds(shiftIds);

    const userIds = [...new Set(allAssignments.map((a) => a.userId))];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const shiftsWithAssignments: ShiftWithAssignments[] = shifts.map((shift) => {
      const shiftAssignments = allAssignments.filter((a) => a.shiftId === shift.id);
      return {
        shift,
        assignments: shiftAssignments
          .map((assignment) => {
            const user = userMap.get(assignment.userId);
            return user ? { assignment, user } : null;
          })
          .filter((a): a is { assignment: AssignmentEntity; user: UserEntity } => a !== null),
      };
    });

    return {
      locationId: input.locationId,
      weekStart: input.weekStart,
      shifts: shiftsWithAssignments,
    };
  }
}
