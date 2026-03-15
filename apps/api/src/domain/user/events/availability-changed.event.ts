import { DomainEvent } from '../../common/domain-event.base';

export class AvailabilityChangedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'User';
  readonly payload: Record<string, unknown>;

  constructor(userId: string) {
    super('AvailabilityChanged');
    this.aggregateId = userId;
    this.payload = { userId };
  }
}
