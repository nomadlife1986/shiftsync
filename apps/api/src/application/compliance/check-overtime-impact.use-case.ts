import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { OvertimeCalculatorService, OvertimeResult } from '../../domain/compliance/services/overtime-calculator.domain-service';

export interface CheckOvertimeImpactInput { userId: string; shiftId: string; weekStart: Date; }

@Injectable()
export class CheckOvertimeImpactUseCase implements IUseCase<CheckOvertimeImpactInput, OvertimeResult> {
  private calculator = new OvertimeCalculatorService();
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY) private assignmentRepo: IAssignmentRepository,
    @Inject(SHIFT_REPOSITORY) private shiftRepo: IShiftRepository,
  ) {}

  async execute(input: CheckOvertimeImpactInput): Promise<OvertimeResult> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    const weekAssignments = await this.assignmentRepo.findByUserAndWeek(input.userId, input.weekStart);
    const shiftIds = weekAssignments.map(a => a.shiftId);
    const shifts = shiftIds.length > 0 ? await this.shiftRepo.findByIds(shiftIds) : [];
    const shiftTimes = shifts.map(s => ({ shiftId: s.id, startTime: s.startTime, endTime: s.endTime }));
    if (shift) shiftTimes.push({ shiftId: shift.id, startTime: shift.startTime, endTime: shift.endTime });
    return this.calculator.calculate({ assignments: shiftTimes, weekStart: input.weekStart });
  }
}
