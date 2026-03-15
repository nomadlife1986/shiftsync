import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { ISwapRequestRepository, SWAP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/swap-request.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { SwapRequestEntity } from '../../domain/coverage/entities/swap-request.entity';

export interface CancelSwapInput { swapId: string; cancelledBy: string; reason?: string; }

@Injectable()
export class CancelSwapUseCase implements IUseCase<CancelSwapInput, SwapRequestEntity> {
  constructor(
    @Inject(SWAP_REQUEST_REPOSITORY) private swapRepo: ISwapRequestRepository,
    @Inject(EVENT_STORE_REPOSITORY) private eventStore: IEventStoreRepository,
  ) {}

  async execute(input: CancelSwapInput): Promise<SwapRequestEntity> {
    const swap = await this.swapRepo.findById(input.swapId);
    if (!swap) throw new NotFoundException('Swap request not found');
    swap.cancel(input.cancelledBy, input.reason);
    await this.swapRepo.save(swap);
    const version = await this.eventStore.getNextVersion(swap.id);
    await this.eventStore.append([{
      aggregateId: swap.id, aggregateType: 'SwapRequest', eventType: 'SwapCancelled', version,
      payload: { swapId: swap.id, cancelledBy: input.cancelledBy, reason: input.reason },
      metadata: { userId: input.cancelledBy, occurredAt: new Date().toISOString() }, occurredAt: new Date(),
    }]);
    return swap;
  }
}
