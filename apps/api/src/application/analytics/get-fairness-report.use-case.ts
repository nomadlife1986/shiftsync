import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { FairnessCalculatorService, FairnessReport } from '../../domain/analytics/services/fairness-calculator.domain-service';

export interface GetFairnessReportInput {
  locationId: string;
  weekStart: Date;
}

@Injectable()
export class GetFairnessReportUseCase implements IUseCase<GetFairnessReportInput, FairnessReport> {
  private fairnessCalculator = new FairnessCalculatorService();

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(input: GetFairnessReportInput): Promise<FairnessReport> {
    const shifts = await this.shiftRepo.findByWeekAndLocation(input.weekStart, input.locationId);
    const shiftIds = shifts.map((s) => s.id);
    const allAssignments = shiftIds.length > 0
      ? await this.assignmentRepo.findByShiftIds(shiftIds)
      : [];

    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    const userIds = [...new Set(allAssignments.filter((a) => a.isActive()).map((a) => a.userId))];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];

    const staffList = users.map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      desiredHours: u.desiredWeeklyHours,
    }));

    const assignments = allAssignments
      .filter((a) => a.isActive())
      .map((a) => {
        const shift = shiftMap.get(a.shiftId);
        return shift
          ? {
              userId: a.userId,
              startTime: shift.startTime,
              endTime: shift.endTime,
              isPremium: shift.isPremiumShift(),
            }
          : null;
      })
      .filter((a): a is { userId: string; startTime: Date; endTime: Date; isPremium: boolean } => a !== null);

    return this.fairnessCalculator.calculate({ staffList, assignments });
  }
}
