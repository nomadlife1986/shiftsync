import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IAssignmentRepository } from '../../../domain/scheduling/repositories/assignment.repository.interface';
import { AssignmentEntity } from '../../../domain/scheduling/entities/assignment.entity';

@Injectable()
export class PrismaAssignmentRepository implements IAssignmentRepository {
  constructor(private prisma: PrismaService) {}

  private toEntity(a: any): AssignmentEntity {
    return AssignmentEntity.reconstitute({
      shiftId: a.shiftId,
      userId: a.userId,
      status: a.status,
      assignedBy: a.assignedBy,
      assignedAt: a.assignedAt ?? a.createdAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }, a.id);
  }

  async findByShiftId(shiftId: string): Promise<AssignmentEntity[]> {
    const assignments = await this.prisma.assignment.findMany({
      where: { shiftId, status: { not: 'CANCELLED' } },
    });
    return assignments.map(a => this.toEntity(a));
  }

  async findByUserId(userId: string, dateRange?: { start: Date; end: Date }): Promise<AssignmentEntity[]> {
    const where: any = { userId, status: { in: ['ASSIGNED', 'SWAP_PENDING'] } };
    if (dateRange) {
      where.shift = { startTime: { gte: dateRange.start, lt: dateRange.end } };
    }
    const assignments = await this.prisma.assignment.findMany({ where, include: { shift: true } });
    return assignments.map(a => this.toEntity(a));
  }

  async findByUserAndWeek(userId: string, weekStart: Date): Promise<AssignmentEntity[]> {
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.findByUserId(userId, { start: weekStart, end: weekEnd });
  }

  async save(assignment: AssignmentEntity): Promise<AssignmentEntity> {
    const data = {
      shiftId: assignment.shiftId,
      userId: assignment.userId,
      status: assignment.status as any,
      assignedBy: assignment.assignedBy,
    };
    // Always check by (shiftId, userId) first — a cancelled record may already exist
    // from a previous unassign, and the schema has a unique constraint on that pair.
    const existingByPair = await this.prisma.assignment.findFirst({
      where: { shiftId: assignment.shiftId, userId: assignment.userId },
    });
    if (existingByPair) {
      await this.prisma.assignment.update({ where: { id: existingByPair.id }, data });
      return this.findById(existingByPair.id) as Promise<AssignmentEntity>;
    }
    await this.prisma.assignment.create({ data: { ...data, id: assignment.id } });
    return this.findById(assignment.id) as Promise<AssignmentEntity>;
  }

  async findById(id: string): Promise<AssignmentEntity | null> {
    if (!id) return null;
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    return a ? this.toEntity(a) : null;
  }

  async findByShiftIds(shiftIds: string[]): Promise<AssignmentEntity[]> {
    const assignments = await this.prisma.assignment.findMany({
      where: { shiftId: { in: shiftIds }, status: { not: 'CANCELLED' } },
    });
    return assignments.map(a => this.toEntity(a));
  }

  async countByShiftId(shiftId: string): Promise<number> {
    return this.prisma.assignment.count({ where: { shiftId, status: { in: ['ASSIGNED', 'SWAP_PENDING'] } } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.assignment.delete({ where: { id } });
  }
}
