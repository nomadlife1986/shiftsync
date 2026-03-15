import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IDropRequestRepository } from '../../../domain/coverage/repositories/drop-request.repository.interface';
import { DropRequestEntity } from '../../../domain/coverage/entities/drop-request.entity';

@Injectable()
export class PrismaDropRequestRepository implements IDropRequestRepository {
  constructor(private prisma: PrismaService) {}

  private toEntity(d: any): DropRequestEntity {
    return DropRequestEntity.reconstitute({
      shiftId: d.shiftId,
      requesterId: d.requesterId,
      status: d.status,
      pickedUpById: d.pickedUpById ?? null,
      managerId: d.managerId ?? null,
      managerNote: d.managerNote ?? null,
      expiresAt: d.expiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }, d.id);
  }

  async findById(id: string): Promise<DropRequestEntity | null> {
    if (!id) return null;
    const d = await this.prisma.dropRequest.findUnique({ where: { id } });
    return d ? this.toEntity(d) : null;
  }

  async findByRequesterId(requesterId: string): Promise<DropRequestEntity[]> {
    const drops = await this.prisma.dropRequest.findMany({ where: { requesterId }, orderBy: { createdAt: 'desc' } });
    return drops.map(d => this.toEntity(d));
  }

  async findByShiftId(shiftId: string): Promise<DropRequestEntity[]> {
    const drops = await this.prisma.dropRequest.findMany({ where: { shiftId } });
    return drops.map(d => this.toEntity(d));
  }

  async findExpired(): Promise<DropRequestEntity[]> {
    const drops = await this.prisma.dropRequest.findMany({
      where: { status: 'OPEN', expiresAt: { lte: new Date() } },
    });
    return drops.map(d => this.toEntity(d));
  }

  async findExpiring(before: Date): Promise<DropRequestEntity[]> {
    return this.findExpired();
  }

  async findAvailable(locationId?: string): Promise<DropRequestEntity[]> {
    const where: any = { status: 'OPEN' };
    if (locationId) where.shift = { locationId };
    const drops = await this.prisma.dropRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return drops.map(d => this.toEntity(d));
  }

  async findOpenByLocationId(locationId?: string): Promise<DropRequestEntity[]> {
    return this.findAvailable(locationId);
  }

  async findAll(filter?: { status?: string }): Promise<DropRequestEntity[]> {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    const drops = await this.prisma.dropRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
    return drops.map(d => this.toEntity(d));
  }

  async countPendingByRequesterId(requesterId: string): Promise<number> {
    return this.prisma.dropRequest.count({
      where: { requesterId, status: { in: ['OPEN', 'PICKED_UP_PENDING'] } },
    });
  }

  async save(drop: DropRequestEntity): Promise<DropRequestEntity> {
    const existing = await this.prisma.dropRequest.findUnique({ where: { id: drop.id } });
    const data = {
      shiftId: drop.shiftId,
      requesterId: drop.requesterId,
      status: drop.status as any,
      pickedUpById: drop.pickedUpById ?? null,
      managerId: drop.managerId ?? null,
      managerNote: drop.managerNote ?? null,
      expiresAt: drop.expiresAt,
    };
    if (!existing) {
      await this.prisma.dropRequest.create({ data: { ...data, id: drop.id, createdAt: drop.createdAt } });
    } else {
      await this.prisma.dropRequest.update({ where: { id: drop.id }, data });
    }
    return this.findById(drop.id) as Promise<DropRequestEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dropRequest.delete({ where: { id } });
  }
}
