import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/gql-auth.guard';
import { DomainEventType } from '../types/shift.type';
import { QueryEventsUseCase } from '../../../application/audit/query-events.use-case';
import { EventFilterInput } from '../inputs/create-shift.input';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AuditResolver {
  constructor(private queryEvents: QueryEventsUseCase) {}

  @Query(() => [DomainEventType])
  async domainEvents(@Args('filter') filter: EventFilterInput): Promise<DomainEventType[]> {
    const events = await this.queryEvents.execute({
      aggregateType: filter.aggregateType,
      aggregateId: filter.aggregateId,
      eventType: filter.eventType,
      startDate: filter.startDate,
      endDate: filter.endDate,
    });
    return events.map(e => ({ id: e.id ?? '', aggregateId: e.aggregateId, aggregateType: e.aggregateType, eventType: e.eventType, version: e.version, occurredAt: e.occurredAt }));
  }
}
