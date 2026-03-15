import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/drop-request.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { DropRequestEntity } from '../../domain/coverage/entities/drop-request.entity';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface CancelDropInput { dropId: string; requestedBy: string; }

@Injectable()
export class CancelDropUseCase implements IUseCase<CancelDropInput, DropRequestEntity> {
  constructor(
    @Inject(DROP_REQUEST_REPOSITORY) private dropRepo: IDropRequestRepository,
    @Inject(EVENT_STORE_REPOSITORY) private eventStore: IEventStoreRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private assignmentRepo: IAssignmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CancelDropInput): Promise<DropRequestEntity> {
    const drop = await this.dropRepo.findById(input.dropId);
    if (!drop) throw new NotFoundException('Drop request not found');

    const assignments = await this.assignmentRepo.findByShiftId(drop.shiftId);
    const requesterAssignment = assignments.find((assignment) => assignment.userId === drop.requesterId);
    drop.cancel();
    await this.prisma.$transaction(async (tx) => {
      if (requesterAssignment) {
        await tx.assignment.update({
          where: { id: requesterAssignment.id },
          data: { status: 'ASSIGNED', assignedBy: requesterAssignment.assignedBy },
        });
      }
      await tx.dropRequest.update({
        where: { id: drop.id },
        data: {
          status: drop.status as any,
          pickedUpById: drop.pickedUpById,
          managerId: drop.managerId,
          managerNote: drop.managerNote,
          expiresAt: drop.expiresAt,
        },
      });
    });
    const version = await this.eventStore.getNextVersion(drop.id);
    await this.eventStore.append([{
      aggregateId: drop.id, aggregateType: 'DropRequest', eventType: 'DropCancelled', version,
      payload: { dropId: drop.id }, metadata: { userId: input.requestedBy, occurredAt: new Date().toISOString() }, occurredAt: new Date(),
    }]);
    return this.dropRepo.findById(drop.id) as Promise<DropRequestEntity>;
  }
}
