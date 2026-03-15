import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY, StoredDomainEvent } from '../../domain/event-store/repositories/event-store.repository.interface';

export interface QueryEventsInput {
  aggregateType?: string;
  aggregateId?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class QueryEventsUseCase implements IUseCase<QueryEventsInput, StoredDomainEvent[]> {
  constructor(
    @Inject(EVENT_STORE_REPOSITORY) private readonly eventStore: IEventStoreRepository,
  ) {}

  async execute(input: QueryEventsInput): Promise<StoredDomainEvent[]> {
    return this.eventStore.queryEvents({
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      dateRange:
        input.startDate && input.endDate
          ? { start: input.startDate, end: input.endDate }
          : undefined,
    });
  }
}
