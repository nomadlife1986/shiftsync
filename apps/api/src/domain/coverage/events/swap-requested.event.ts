import { DomainEvent } from '../../common/domain-event.base';

export class SwapRequestedEvent extends DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType = 'SwapRequest';
  readonly payload: Record<string, unknown>;

  constructor(swapId: string, shiftId: string, requesterId: string, targetId: string | null) {
    super('SwapRequested');
    this.aggregateId = swapId;
    this.payload = { swapId, shiftId, requesterId, targetId };
  }
}
