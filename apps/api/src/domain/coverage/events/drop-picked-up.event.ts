import { DomainEvent } from '../../common/domain-event.base';

export class DropPickedUpEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'DropRequest';
  readonly payload: Record<string, unknown>;

  constructor(dropId: string, pickedUpById: string) {
    super('DropPickedUp');
    this.aggregateId = dropId;
    this.payload = { dropId, pickedUpById };
  }
}
