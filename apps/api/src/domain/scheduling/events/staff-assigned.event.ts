import { DomainEvent } from '../../common/domain-event.base';

export class StaffAssignedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'Shift';
  readonly payload: Record<string, unknown>;

  constructor(shiftId: string, userId: string, assignedBy: string) {
    super('StaffAssigned');
    this.aggregateId = shiftId;
    this.payload = { shiftId, userId, assignedBy };
  }
}
