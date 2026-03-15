import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY, StoredDomainEvent } from '../../domain/event-store/repositories/event-store.repository.interface';

export interface GetShiftHistoryInput {
  shiftId: string;
}

@Injectable()
export class GetShiftHistoryUseCase implements IUseCase<GetShiftHistoryInput, StoredDomainEvent[]> {
  constructor(
    @Inject(EVENT_STORE_REPOSITORY) private readonly eventStore: IEventStoreRepository,
  ) {}

  async execute(input: GetShiftHistoryInput): Promise<StoredDomainEvent[]> {
    return this.eventStore.loadEvents(input.shiftId);
  }
}
