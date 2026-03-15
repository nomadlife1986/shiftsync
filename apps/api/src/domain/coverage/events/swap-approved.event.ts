import { DomainEvent } from '../../common/domain-event.base';

export class SwapApprovedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'SwapRequest';
  readonly payload: Record<string, unknown>;

  constructor(swapId: string, managerId: string) {
    super('SwapApproved');
    this.aggregateId = swapId;
    this.payload = { swapId, managerId };
  }
}
