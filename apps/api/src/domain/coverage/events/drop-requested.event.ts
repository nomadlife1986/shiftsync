import { DomainEvent } from '../../common/domain-event.base';

export class DropRequestedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'DropRequest';
  readonly payload: Record<string, unknown>;

  constructor(dropId: string, shiftId: string, requesterId: string) {
    super('DropRequested');
    this.aggregateId = dropId;
    this.payload = { dropId, shiftId, requesterId };
  }
}
