import { DomainEvent } from '../../common/domain-event.base';

export class ShiftPublishedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'Shift';
  readonly payload: Record<string, unknown>;

  constructor(shiftId: string, locationId: string) {
    super('ShiftPublished');
    this.aggregateId = shiftId;
    this.payload = { shiftId, locationId };
  }
}
