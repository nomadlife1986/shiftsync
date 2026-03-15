export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventType: string;

  abstract readonly aggregateId: string;
  abstract readonly aggregateType: string;
  abstract readonly payload: Record<string, unknown>;

  constructor(eventType: string) {
    this.occurredAt = new Date();
    this.eventType = eventType;
  }
}
