import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/gql-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { SwapRequestType, DropRequestType } from '../types/coverage.type';
import { RequestSwapInput, RequestDropInput } from '../inputs/create-shift.input';
import { RequestSwapUseCase } from '../../../application/coverage/request-swap.use-case';
import { AcceptSwapUseCase } from '../../../application/coverage/accept-swap.use-case';
import { ApproveSwapUseCase } from '../../../application/coverage/approve-swap.use-case';
import { RejectSwapUseCase } from '../../../application/coverage/reject-swap.use-case';
import { CancelSwapUseCase } from '../../../application/coverage/cancel-swap.use-case';
import { RequestDropUseCase } from '../../../application/coverage/request-drop.use-case';
import { PickupDropUseCase } from '../../../application/coverage/pickup-drop.use-case';
import { ApproveDropUseCase } from '../../../application/coverage/approve-drop.use-case';
import { RejectDropUseCase } from '../../../application/coverage/reject-drop.use-case';
import { CancelDropUseCase } from '../../../application/coverage/cancel-drop.use-case';
import { ISwapRequestRepository, SWAP_REQUEST_REPOSITORY } from '../../../domain/coverage/repositories/swap-request.repository.interface';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../../domain/coverage/repositories/drop-request.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../../domain/scheduling/repositories/shift.repository.interface';

@Resolver()
@UseGuards(JwtAuthGuard)
export class CoverageResolver {
  constructor(
    private requestSwapUc: RequestSwapUseCase,
    private acceptSwapUc: AcceptSwapUseCase,
    private approveSwapUc: ApproveSwapUseCase,
    private rejectSwapUc: RejectSwapUseCase,
    private cancelSwapUc: CancelSwapUseCase,
    private requestDropUc: RequestDropUseCase,
    private pickupDropUc: PickupDropUseCase,
    private approveDropUc: ApproveDropUseCase,
    private rejectDropUc: RejectDropUseCase,
    private cancelDropUc: CancelDropUseCase,
    @Inject(SWAP_REQUEST_REPOSITORY) private swapRepo: ISwapRequestRepository,
    @Inject(DROP_REQUEST_REPOSITORY) private dropRepo: IDropRequestRepository,
    @Inject(SHIFT_REPOSITORY) private shiftRepo: IShiftRepository,
  ) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  @Query(() => [SwapRequestType])
  async swapRequests(@CurrentUser() user: { id: string; role: string }): Promise<SwapRequestType[]> {
    const isManager = user.role === 'ADMIN' || user.role === 'MANAGER';
    if (isManager) {
      const all = await this.swapRepo.findAll();
      return this.toSwapTypes(all);
    }
    const [asRequester, asTarget] = await Promise.all([
      this.swapRepo.findByRequesterId(user.id),
      this.swapRepo.findByTargetId(user.id),
    ]);
    const seen = new Set<string>();
    const combined = [...asRequester, ...asTarget].filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    return this.toSwapTypes(combined);
  }

  @Query(() => [DropRequestType])
  async dropRequests(@CurrentUser() user: { id: string; role: string }): Promise<DropRequestType[]> {
    const isManager = user.role === 'ADMIN' || user.role === 'MANAGER';
    const drops = isManager
      ? await this.dropRepo.findAll()
      : await this.dropRepo.findByRequesterId(user.id);
    return this.toDropTypes(drops);
  }

  @Query(() => [DropRequestType])
  async availableDrops(
    @Args('locationId', { type: () => ID, nullable: true }) locationId?: string,
  ): Promise<DropRequestType[]> {
    const drops = await this.dropRepo.findAvailable(locationId);
    return this.toDropTypes(drops);
  }

  // ── Swap Mutations ────────────────────────────────────────────────────────

  @Mutation(() => SwapRequestType)
  async requestSwap(
    @Args('input') input: RequestSwapInput,
    @CurrentUser() user: { id: string },
  ): Promise<SwapRequestType> {
    const swap = await this.requestSwapUc.execute({ shiftId: input.shiftId, requesterId: user.id, targetId: input.targetId });
    return this.toSwapType(swap);
  }

  @Mutation(() => SwapRequestType)
  async acceptSwap(
    @Args('swapId', { type: () => ID }) swapId: string,
    @CurrentUser() user: { id: string },
  ): Promise<SwapRequestType> {
    const swap = await this.acceptSwapUc.execute({ swapId, userId: user.id });
    return this.toSwapType(swap);
  }

  @Mutation(() => SwapRequestType)
  async approveSwap(
    @Args('swapId', { type: () => ID }) swapId: string,
    @CurrentUser() user: { id: string },
  ): Promise<SwapRequestType> {
    const swap = await this.approveSwapUc.execute({ swapId, managerId: user.id });
    return this.toSwapType(swap);
  }

  @Mutation(() => SwapRequestType)
  async rejectSwap(
    @Args('swapId', { type: () => ID }) swapId: string,
    @Args('note', { type: () => String, nullable: true }) note: string | undefined,
    @CurrentUser() user: { id: string },
  ): Promise<SwapRequestType> {
    const swap = await this.rejectSwapUc.execute({ swapId, managerId: user.id, note });
    return this.toSwapType(swap);
  }

  @Mutation(() => SwapRequestType)
  async cancelSwap(
    @Args('swapId', { type: () => ID }) swapId: string,
    @Args('reason', { type: () => String, nullable: true }) reason: string | undefined,
    @CurrentUser() user: { id: string },
  ): Promise<SwapRequestType> {
    const swap = await this.cancelSwapUc.execute({ swapId, cancelledBy: user.id, reason });
    return this.toSwapType(swap);
  }

  // ── Drop Mutations ────────────────────────────────────────────────────────

  @Mutation(() => DropRequestType)
  async requestDrop(
    @Args('input') input: RequestDropInput,
    @CurrentUser() user: { id: string },
  ): Promise<DropRequestType> {
    const drop = await this.requestDropUc.execute({ shiftId: input.shiftId, requesterId: user.id });
    return this.toDropType(drop);
  }

  @Mutation(() => DropRequestType)
  async pickupDrop(
    @Args('dropId', { type: () => ID }) dropId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DropRequestType> {
    const drop = await this.pickupDropUc.execute({ dropId, userId: user.id });
    return this.toDropType(drop);
  }

  @Mutation(() => DropRequestType)
  async approveDrop(
    @Args('dropId', { type: () => ID }) dropId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DropRequestType> {
    const drop = await this.approveDropUc.execute({ dropId, managerId: user.id });
    return this.toDropType(drop);
  }

  @Mutation(() => DropRequestType)
  async rejectDrop(
    @Args('dropId', { type: () => ID }) dropId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DropRequestType> {
    const drop = await this.rejectDropUc.execute({ dropId, managerId: user.id });
    return this.toDropType(drop);
  }

  @Mutation(() => DropRequestType)
  async cancelDrop(
    @Args('dropId', { type: () => ID }) dropId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DropRequestType> {
    const drop = await this.cancelDropUc.execute({ dropId, requestedBy: user.id });
    return this.toDropType(drop);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private toSwapType(s: any): SwapRequestType {
    return {
      id: s.id,
      shiftId: s.shiftId,
      requesterId: s.requesterId,
      targetId: s.targetId ?? undefined,
      status: s.status,
      targetAccepted: s.targetAccepted ?? undefined,
      managerApproved: s.managerApproved ?? undefined,
      managerId: s.managerId ?? undefined,
      cancelReason: s.cancelReason ?? undefined,
      expiresAt: s.expiresAt ?? undefined,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private async toSwapTypes(swaps: any[]): Promise<SwapRequestType[]> {
    const shiftMap = await this.loadShiftMap(swaps.map((swap) => swap.shiftId));
    return swaps.map((swap) => ({
      ...this.toSwapType(swap),
      shift: shiftMap.get(swap.shiftId),
    }));
  }

  private toDropType(d: any): DropRequestType {
    return {
      id: d.id,
      shiftId: d.shiftId,
      requesterId: d.requesterId,
      status: d.status,
      pickedUpById: d.pickedUpById ?? undefined,
      managerId: d.managerId ?? undefined,
      expiresAt: d.expiresAt,
      managerNote: d.managerNote ?? undefined,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private async toDropTypes(drops: any[]): Promise<DropRequestType[]> {
    const shiftMap = await this.loadShiftMap(drops.map((drop) => drop.shiftId));
    return drops.map((drop) => ({
      ...this.toDropType(drop),
      shift: shiftMap.get(drop.shiftId),
    }));
  }

  private async loadShiftMap(shiftIds: string[]): Promise<Map<string, any>> {
    const uniqueShiftIds = [...new Set(shiftIds.filter(Boolean))];
    if (uniqueShiftIds.length === 0) return new Map();

    const shifts = await this.shiftRepo.findByIds(uniqueShiftIds);
    return new Map(
      shifts.map((shift) => [
        shift.id,
        {
          id: shift.id,
          locationId: shift.locationId,
          startTime: shift.startTime,
          endTime: shift.endTime,
          requiredSkill: shift.requiredSkill,
          headcount: shift.headcount,
          status: shift.status,
          scheduleWeek: shift.scheduleWeek ?? undefined,
          publishedAt: shift.publishedAt ?? undefined,
          editCutoffHours: shift.editCutoffHours,
          assignments: [],
          createdAt: shift.createdAt,
          updatedAt: shift.updatedAt,
        },
      ]),
    );
  }
}
