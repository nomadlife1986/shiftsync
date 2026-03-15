import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IShiftRepository } from '../../../domain/scheduling/repositories/shift.repository.interface';
import { ShiftEntity } from '../../../domain/scheduling/entities/shift.entity';

@Injectable()
export class PrismaShiftRepository implements IShiftRepository {
  constructor(private prisma: PrismaService) {}

  private toEntity(s: any): ShiftEntity {
    return ShiftEntity.reconstitute({
      locationId: s.locationId,
      startTime: s.startTime,
      endTime: s.endTime,
      requiredSkill: s.requiredSkill,
      headcount: s.headcount,
      status: s.status,
      scheduleWeek: s.scheduleWeek,
      publishedAt: s.publishedAt,
      editCutoffHours: s.editCutoffHours,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }, s.id);
  }

  async findById(id: string): Promise<ShiftEntity | null> {
    if (!id) return null;
    const s = await this.prisma.shift.findUnique({ where: { id } });
    return s ? this.toEntity(s) : null;
  }

  async findByIds(ids: string[]): Promise<ShiftEntity[]> {
    const shifts = await this.prisma.shift.findMany({ where: { id: { in: ids } } });
    return shifts.map(s => this.toEntity(s));
  }

  async findByWeekAndLocation(week: Date, locationId: string): Promise<ShiftEntity[]> {
    const weekEnd = new Date(week.getTime() + 7 * 24 * 60 * 60 * 1000);
    const shifts = await this.prisma.shift.findMany({
      where: { locationId, scheduleWeek: { gte: week, lt: weekEnd } },
      orderBy: { startTime: 'asc' },
    });
    return shifts.map(s => this.toEntity(s));
  }

  async findOverlapping(userId: string, start: Date, end: Date, excludeShiftId?: string): Promise<ShiftEntity[]> {
    const assignments = await this.prisma.assignment.findMany({
      where: { userId, status: { in: ['ASSIGNED', 'SWAP_PENDING'] } },
      include: { shift: true },
    });
    return assignments
      .filter(a => {
        if (excludeShiftId && a.shiftId === excludeShiftId) return false;
        return a.shift.startTime < end && a.shift.endTime > start;
      })
      .map(a => this.toEntity(a.shift));
  }

  async findByDateRange(start: Date, end: Date, locationId?: string): Promise<ShiftEntity[]> {
    const where: any = { startTime: { gte: start, lt: end } };
    if (locationId) where.locationId = locationId;
    const shifts = await this.prisma.shift.findMany({ where, orderBy: { startTime: 'asc' } });
    return shifts.map(s => this.toEntity(s));
  }

  async save(shift: ShiftEntity): Promise<ShiftEntity> {
    const existing = shift.id ? await this.prisma.shift.findUnique({ where: { id: shift.id } }) : null;
    const data = {
      locationId: shift.locationId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredSkill: shift.requiredSkill as any,
      headcount: shift.headcount,
      status: shift.status as any,
      scheduleWeek: shift.scheduleWeek,
      publishedAt: shift.publishedAt,
      editCutoffHours: shift.editCutoffHours,
    };
    if (!existing) {
      await this.prisma.shift.create({ data: { ...data, id: shift.id, createdAt: shift.createdAt } });
    } else {
      await this.prisma.shift.update({ where: { id: shift.id }, data });
    }
    return this.findById(shift.id) as Promise<ShiftEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.shift.delete({ where: { id } });
  }
}
