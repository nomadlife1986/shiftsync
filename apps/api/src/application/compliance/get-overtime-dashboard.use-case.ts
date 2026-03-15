import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { OvertimeCalculatorService, OvertimeResult } from '../../domain/compliance/services/overtime-calculator.domain-service';

export interface GetOvertimeDashboardInput {
  locationId: string;
  weekStart: Date;
}

export interface UserOvertimeDetail {
  userId: string;
  firstName: string;
  lastName: string;
  overtime: OvertimeResult;
}

export interface OvertimeDashboardOutput {
  locationId: string;
  weekStart: Date;
  staffOvertime: UserOvertimeDetail[];
  totalOvertimeHours: number;
  totalProjectedCost: number;
  staffAtRisk: number;
}

@Injectable()
export class GetOvertimeDashboardUseCase implements IUseCase<GetOvertimeDashboardInput, OvertimeDashboardOutput> {
  private overtimeCalculator = new OvertimeCalculatorService();

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(input: GetOvertimeDashboardInput): Promise<OvertimeDashboardOutput> {
    const shifts = await this.shiftRepo.findByWeekAndLocation(input.weekStart, input.locationId);
    if (shifts.length === 0) {
      return {
        locationId: input.locationId,
        weekStart: input.weekStart,
        staffOvertime: [],
        totalOvertimeHours: 0,
        totalProjectedCost: 0,
        staffAtRisk: 0,
      };
    }

    const shiftIds = shifts.map((s) => s.id);
    const allAssignments = await this.assignmentRepo.findByShiftIds(shiftIds);

    const userIds = [...new Set(allAssignments.filter((a) => a.isActive()).map((a) => a.userId))];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    const staffOvertime: UserOvertimeDetail[] = [];
    let totalOvertimeHours = 0;
    let totalProjectedCost = 0;
    let staffAtRisk = 0;

    for (const userId of userIds) {
      const user = userMap.get(userId);
      if (!user) continue;

      const userAssignments = allAssignments.filter((a) => a.userId === userId && a.isActive());
      const shiftTimes = userAssignments
        .map((a) => {
          const shift = shiftMap.get(a.shiftId);
          return shift
            ? { shiftId: shift.id, startTime: shift.startTime, endTime: shift.endTime }
            : null;
        })
        .filter((s): s is { shiftId: string; startTime: Date; endTime: Date } => s !== null);

      const overtime = this.overtimeCalculator.calculate({
        assignments: shiftTimes,
        weekStart: input.weekStart,
      });

      staffOvertime.push({
        userId,
        firstName: user.firstName,
        lastName: user.lastName,
        overtime,
      });

      totalOvertimeHours += overtime.overtimeHours;
      totalProjectedCost += overtime.projectedCost;
      if (overtime.warnings.length > 0 || overtime.blocks.length > 0) {
        staffAtRisk++;
      }
    }

    return {
      locationId: input.locationId,
      weekStart: input.weekStart,
      staffOvertime,
      totalOvertimeHours,
      totalProjectedCost,
      staffAtRisk,
    };
  }
}
