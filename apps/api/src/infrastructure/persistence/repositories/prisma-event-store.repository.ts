import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IEventStoreRepository, StoredDomainEvent } from '../../../domain/event-store/repositories/event-store.repository.interface';

@Injectable()
export class PrismaEventStoreRepository implements IEventStoreRepository {
  constructor(private prisma: PrismaService) {}

  async append(events: StoredDomainEvent[]): Promise<void> {
    await this.prisma.domainEvent.createMany({
      data: events.map(e => ({
        id: e.id,
        aggregateId: e.aggregateId,
        aggregateType: e.aggregateType,
        eventType: e.eventType,
        version: e.version,
        payload: e.payload as any,
        metadata: e.metadata as any,
        occurredAt: e.occurredAt,
      })),
    });
  }

  async loadEvents(aggregateId: string): Promise<StoredDomainEvent[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: { aggregateId },
      orderBy: { version: 'asc' },
    });
    return events.map(e => ({
      id: e.id,
      aggregateId: e.aggregateId,
      aggregateType: e.aggregateType,
      eventType: e.eventType,
      version: e.version,
      payload: e.payload as Record<string, unknown>,
      metadata: e.metadata as Record<string, unknown>,
      occurredAt: e.occurredAt,
    }));
  }

  async loadEventsByType(aggregateType: string, dateRange?: { start: Date; end: Date }): Promise<StoredDomainEvent[]> {
    const where: any = { aggregateType };
    if (dateRange) where.occurredAt = { gte: dateRange.start, lte: dateRange.end };
    const events = await this.prisma.domainEvent.findMany({ where, orderBy: { occurredAt: 'asc' } });
    return events.map(e => ({ ...e, payload: e.payload as Record<string, unknown>, metadata: e.metadata as Record<string, unknown> }));
  }

  async queryEvents(filter: { aggregateType?: string; aggregateId?: string; eventType?: string; dateRange?: { start: Date; end: Date } }): Promise<StoredDomainEvent[]> {
    const where: any = {};
    if (filter.aggregateType) where.aggregateType = filter.aggregateType;
    if (filter.aggregateId) where.aggregateId = filter.aggregateId;
    if (filter.eventType) where.eventType = filter.eventType;
    if (filter.dateRange) where.occurredAt = { gte: filter.dateRange.start, lte: filter.dateRange.end };
    const events = await this.prisma.domainEvent.findMany({ where, orderBy: { occurredAt: 'asc' } });
    return events.map(e => ({ ...e, payload: e.payload as Record<string, unknown>, metadata: e.metadata as Record<string, unknown> }));
  }

  async getNextVersion(aggregateId: string): Promise<number> {
    const lastEvent = await this.prisma.domainEvent.findFirst({
      where: { aggregateId },
      orderBy: { version: 'desc' },
    });
    return (lastEvent?.version ?? 0) + 1;
  }
}
