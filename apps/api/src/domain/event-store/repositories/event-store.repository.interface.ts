export interface StoredDomainEvent {
  id?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  occurredAt: Date;
}

export interface IEventStoreRepository {
  append(events: StoredDomainEvent[]): Promise<void>;
  loadEvents(aggregateId: string): Promise<StoredDomainEvent[]>;
  loadEventsByType(aggregateType: string, dateRange?: { start: Date; end: Date }): Promise<StoredDomainEvent[]>;
  queryEvents(filter: {
    aggregateType?: string;
    aggregateId?: string;
    eventType?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<StoredDomainEvent[]>;
  getNextVersion(aggregateId: string): Promise<number>;
}

export const EVENT_STORE_REPOSITORY = 'IEventStoreRepository';
