import { DomainEvent } from '../../common/domain-event.base';

export class ShiftCreatedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'Shift';
  readonly payload: Record<string, unknown>;

  constructor(shiftId: string, locationId: string) {
    super('ShiftCreated');
    this.aggregateId = shiftId;
    this.payload = { shiftId, locationId };
  }
}
