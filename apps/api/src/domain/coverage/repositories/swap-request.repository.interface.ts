import { SwapRequestEntity } from '../entities/swap-request.entity';

export interface ISwapRequestRepository {
  findById(id: string): Promise<SwapRequestEntity | null>;
  findByRequesterId(requesterId: string): Promise<SwapRequestEntity[]>;
  findPendingByRequesterId(requesterId: string): Promise<SwapRequestEntity[]>;
  findByShiftId(shiftId: string): Promise<SwapRequestEntity[]>;
  findPendingByShiftId(shiftId: string): Promise<SwapRequestEntity[]>;
  findByTargetId(targetId: string): Promise<SwapRequestEntity[]>;
  findAll(filter?: { status?: string }): Promise<SwapRequestEntity[]>;
  countPendingByRequesterId(requesterId: string): Promise<number>;
  save(swap: SwapRequestEntity): Promise<SwapRequestEntity>;
  delete(id: string): Promise<void>;
}

export const SWAP_REQUEST_REPOSITORY = 'ISwapRequestRepository';
