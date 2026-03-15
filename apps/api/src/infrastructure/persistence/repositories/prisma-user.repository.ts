import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IUserRepository } from '../../../domain/user/repositories/user.repository.interface';
import { UserEntity } from '../../../domain/user/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  private toEntity(user: any): UserEntity {
    return UserEntity.reconstitute({
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone ?? null,
      desiredWeeklyHours: user.desiredWeeklyHours ?? null,
      skills: (user.skills ?? []).map((s: any) => s.skill),
      certifications: (user.certifications ?? []).map((c: any) => ({
        locationId: c.locationId,
        certifiedAt: c.certifiedAt,
        revokedAt: c.revokedAt ?? null,
      })),
      availabilities: (user.availabilities ?? []).map((a: any) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isRecurring: a.isRecurring,
        specificDate: a.specificDate ?? null,
        isAvailable: a.isAvailable,
      })),
      managedLocationIds: (user.managedLocations ?? []).map((ml: any) => ml.locationId),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }, user.id);
  }

  private includeClause = {
    skills: true,
    certifications: true,
    availabilities: true,
    managedLocations: true,
  };

  async findById(id: string): Promise<UserEntity | null> {
    if (!id) return null;
    const user = await this.prisma.user.findUnique({ where: { id }, include: this.includeClause });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: this.includeClause });
    return user ? this.toEntity(user) : null;
  }

  async findByIds(ids: string[]): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      include: this.includeClause,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map(u => this.toEntity(u));
  }

  async findAll(filter?: { role?: string; locationId?: string }): Promise<UserEntity[]> {
    const where: any = {};
    if (filter?.role) where.role = filter.role;
    if (filter?.locationId) {
      where.OR = [
        { managerLocations: { some: { locationId: filter.locationId } } },
        { certifications: { some: { locationId: filter.locationId, revokedAt: null } } },
      ];
    }
    const users = await this.prisma.user.findMany({
      where,
      include: this.includeClause,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map(u => this.toEntity(u));
  }

  async findStaffByLocationAndSkill(locationId: string, skill: string): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        skills: { some: { skill } },
        certifications: { some: { locationId, revokedAt: null } },
      },
      include: this.includeClause,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map(u => this.toEntity(u));
  }

  async findAvailableStaff(locationId: string, skill: string, start: Date, end: Date): Promise<UserEntity[]> {
    // Get staff with skill + cert at location, then filter by availability in application layer
    return this.findStaffByLocationAndSkill(locationId, skill);
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const existing = await this.prisma.user.findUnique({ where: { id: user.id } });
    const data = {
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any,
      phone: user.phone ?? null,
      desiredWeeklyHours: user.desiredWeeklyHours ?? null,
    };
    if (!existing) {
      await this.prisma.user.create({ data: { ...data, id: user.id, createdAt: user.createdAt } });
    } else {
      await this.prisma.user.update({ where: { id: user.id }, data });
    }
    // Sync skills
    if (user.skills) {
      await this.prisma.staffSkill.deleteMany({ where: { userId: user.id } });
      if (user.skills.length > 0) {
        await this.prisma.staffSkill.createMany({ data: user.skills.map(s => ({ userId: user.id, skill: s as any })) });
      }
    }
    // Sync availability
    if (user.availabilities) {
      await this.prisma.availability.deleteMany({ where: { userId: user.id } });
      if (user.availabilities.length > 0) {
        await this.prisma.availability.createMany({
          data: user.availabilities.map(a => ({
            userId: user.id,
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            isRecurring: a.isRecurring,
            specificDate: a.specificDate ?? null,
            isAvailable: a.isAvailable,
          })),
        });
      }
    }
    return this.findById(user.id) as Promise<UserEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
