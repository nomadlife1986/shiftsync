import { DomainEvent } from '../../common/domain-event.base';

export class StaffUnassignedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'Shift';
  readonly payload: Record<string, unknown>;

  constructor(shiftId: string, userId: string, unassignedBy: string) {
    super('StaffUnassigned');
    this.aggregateId = shiftId;
    this.payload = { shiftId, userId, unassignedBy };
  }
}
