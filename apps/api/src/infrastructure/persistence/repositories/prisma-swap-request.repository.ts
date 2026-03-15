import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ISwapRequestRepository } from '../../../domain/coverage/repositories/swap-request.repository.interface';
import { SwapRequestEntity } from '../../../domain/coverage/entities/swap-request.entity';

@Injectable()
export class PrismaSwapRequestRepository implements ISwapRequestRepository {
  constructor(private prisma: PrismaService) {}

  private toEntity(s: any): SwapRequestEntity {
    return SwapRequestEntity.reconstitute({
      shiftId: s.shiftId,
      requesterId: s.requesterId,
      targetId: s.targetId ?? null,
      status: s.status,
      targetAccepted: s.targetAccepted ?? null,
      managerApproved: s.managerApproved ?? null,
      managerId: s.managerId ?? null,
      managerNote: s.managerNote ?? null,
      cancelledBy: s.cancelledBy ?? null,
      cancelReason: s.cancelReason ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }, s.id);
  }

  async findById(id: string): Promise<SwapRequestEntity | null> {
    if (!id) return null;
    const s = await this.prisma.swapRequest.findUnique({ where: { id } });
    return s ? this.toEntity(s) : null;
  }

  async findByRequesterId(requesterId: string): Promise<SwapRequestEntity[]> {
    const swaps = await this.prisma.swapRequest.findMany({ where: { requesterId }, orderBy: { createdAt: 'desc' } });
    return swaps.map(s => this.toEntity(s));
  }

  async findByUserId(userId: string): Promise<SwapRequestEntity[]> {
    const swaps = await this.prisma.swapRequest.findMany({
      where: { OR: [{ requesterId: userId }, { targetId: userId }] },
      orderBy: { createdAt: 'desc' },
    });
    return swaps.map(s => this.toEntity(s));
  }

  async findPendingByRequesterId(requesterId: string): Promise<SwapRequestEntity[]> {
    const swaps = await this.prisma.swapRequest.findMany({
      where: { requesterId, status: { in: ['PENDING_ACCEPTANCE', 'PENDING_APPROVAL'] } },
    });
    return swaps.map(s => this.toEntity(s));
  }

  async findByShiftId(shiftId: string): Promise<SwapRequestEntity[]> {
    const swaps = await this.prisma.swapRequest.findMany({ where: { shiftId } });
    return swaps.map(s => this.toEntity(s));
  }

  async findPendingByShiftId(shiftId: string): Promise<SwapRequestEntity[]> {
    const swaps = await this.prisma.swapRequest.findMany({
      where: { shiftId, status: { in: ['PENDING_ACCEPTANCE', 'PENDING_APPROVAL'] } },
    });
    return swaps.map(s => this.toEntity(s));
  }

  async findByTargetId(targetId: string): Promise<SwapRequestEntity[]> {
    const swaps = await this.prisma.swapRequest.findMany({ where: { targetId }, orderBy: { createdAt: 'desc' } });
    return swaps.map(s => this.toEntity(s));
  }

  async findAll(filter?: { status?: string }): Promise<SwapRequestEntity[]> {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    const swaps = await this.prisma.swapRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
    return swaps.map(s => this.toEntity(s));
  }

  async countPendingByRequesterId(requesterId: string): Promise<number> {
    return this.prisma.swapRequest.count({
      where: { requesterId, status: { in: ['PENDING_ACCEPTANCE', 'PENDING_APPROVAL'] } },
    });
  }

  async save(swap: SwapRequestEntity): Promise<SwapRequestEntity> {
    const existing = await this.prisma.swapRequest.findUnique({ where: { id: swap.id } });
    const data = {
      shiftId: swap.shiftId,
      requesterId: swap.requesterId,
      targetId: swap.targetId ?? null,
      status: swap.status as any,
      targetAccepted: swap.targetAccepted ?? null,
      managerApproved: swap.managerApproved ?? null,
      managerId: swap.managerId ?? null,
      managerNote: swap.managerNote ?? null,
      cancelledBy: swap.cancelledBy ?? null,
      cancelReason: swap.cancelReason ?? null,
    };
    if (!existing) {
      await this.prisma.swapRequest.create({ data: { ...data, id: swap.id, createdAt: swap.createdAt } });
    } else {
      await this.prisma.swapRequest.update({ where: { id: swap.id }, data });
    }
    return this.findById(swap.id) as Promise<SwapRequestEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.swapRequest.delete({ where: { id } });
  }
}
