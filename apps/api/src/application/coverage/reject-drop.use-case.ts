import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/drop-request.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { DropRequestEntity } from '../../domain/coverage/entities/drop-request.entity';

export interface RejectDropInput { dropId: string; managerId: string; note?: string; }

@Injectable()
export class RejectDropUseCase implements IUseCase<RejectDropInput, DropRequestEntity> {
  constructor(
    @Inject(DROP_REQUEST_REPOSITORY) private dropRepo: IDropRequestRepository,
    @Inject(EVENT_STORE_REPOSITORY) private eventStore: IEventStoreRepository,
  ) {}

  async execute(input: RejectDropInput): Promise<DropRequestEntity> {
    const drop = await this.dropRepo.findById(input.dropId);
    if (!drop) throw new NotFoundException('Drop request not found');
    drop.reject(input.managerId);
    await this.dropRepo.save(drop);
    const version = await this.eventStore.getNextVersion(drop.id);
    await this.eventStore.append([{
      aggregateId: drop.id, aggregateType: 'DropRequest', eventType: 'DropRejected', version,
      payload: { dropId: drop.id, managerId: input.managerId, note: input.note },
      metadata: { userId: input.managerId, occurredAt: new Date().toISOString() }, occurredAt: new Date(),
    }]);
    return drop;
  }
}
