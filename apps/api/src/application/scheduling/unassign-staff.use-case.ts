import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';

export interface UnassignStaffInput { shiftId: string; userId: string; requestedBy: string; }

@Injectable()
export class UnassignStaffUseCase implements IUseCase<UnassignStaffInput, boolean> {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY) private assignmentRepo: IAssignmentRepository,
    @Inject(EVENT_STORE_REPOSITORY) private eventStore: IEventStoreRepository,
  ) {}

  async execute(input: UnassignStaffInput): Promise<boolean> {
    const assignments = await this.assignmentRepo.findByShiftId(input.shiftId);
    const assignment = assignments.find(a => a.userId === input.userId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    assignment.markCancelled();
    await this.assignmentRepo.save(assignment);
    const version = await this.eventStore.getNextVersion(input.shiftId);
    await this.eventStore.append([{
      aggregateId: input.shiftId, aggregateType: 'Shift', eventType: 'StaffUnassigned', version,
      payload: { shiftId: input.shiftId, userId: input.userId }, metadata: { userId: input.requestedBy, occurredAt: new Date().toISOString() }, occurredAt: new Date(),
    }]);
    return true;
  }
}
