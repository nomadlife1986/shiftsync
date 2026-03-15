import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ILocationRepository } from '../../../domain/location/repositories/location.repository.interface';
import { LocationEntity } from '../../../domain/location/entities/location.entity';

@Injectable()
export class PrismaLocationRepository implements ILocationRepository {
  constructor(private prisma: PrismaService) {}

  private toEntity(l: any): LocationEntity {
    return LocationEntity.reconstitute({
      name: l.name,
      address: l.address,
      timezone: l.timezone,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }, l.id);
  }

  async findById(id: string): Promise<LocationEntity | null> {
    const l = await this.prisma.location.findUnique({ where: { id } });
    return l ? this.toEntity(l) : null;
  }

  async findAll(): Promise<LocationEntity[]> {
    const locations = await this.prisma.location.findMany({ orderBy: { name: 'asc' } });
    return locations.map(l => this.toEntity(l));
  }

  async findByIds(ids: string[]): Promise<LocationEntity[]> {
    const locations = await this.prisma.location.findMany({ where: { id: { in: ids } } });
    return locations.map(l => this.toEntity(l));
  }

  async save(location: LocationEntity): Promise<LocationEntity> {
    const existing = await this.prisma.location.findUnique({ where: { id: location.id } });
    const data = {
      name: location.name,
      address: location.address,
      timezone: location.timezone,
      updatedAt: new Date(),
    };
    if (!existing) {
      await this.prisma.location.create({ data: { ...data, id: location.id, createdAt: location.createdAt } });
    } else {
      await this.prisma.location.update({ where: { id: location.id }, data });
    }
    return this.findById(location.id) as Promise<LocationEntity>;
  }
}
