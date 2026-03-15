import { DomainEvent } from '../../common/domain-event.base';

export class SchedulePublishedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'Shift';
  readonly payload: Record<string, unknown>;

  constructor(locationId: string, week: string, shiftIds: string[]) {
    super('SchedulePublished');
    this.aggregateId = locationId;
    this.payload = { locationId, week, shiftIds };
  }
}
