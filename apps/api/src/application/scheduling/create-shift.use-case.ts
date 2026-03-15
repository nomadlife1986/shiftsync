import { Inject, Injectable, NotFoundException } from '@nestjs/common';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // roll back to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { ILocationRepository, LOCATION_REPOSITORY } from '../../domain/location/repositories/location.repository.interface';
import { ShiftEntity } from '../../domain/scheduling/entities/shift.entity';
import { randomUUID } from 'crypto';

export interface CreateShiftInput {
  locationId: string;
  startTime: Date;
  endTime: Date;
  requiredSkill: string;
  headcount: number;
  scheduleWeek?: Date;
  editCutoffHours?: number;
  createdBy: string;
}

@Injectable()
export class CreateShiftUseCase implements IUseCase<CreateShiftInput, ShiftEntity> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(EVENT_STORE_REPOSITORY) private readonly eventStore: IEventStoreRepository,
    @Inject(LOCATION_REPOSITORY) private readonly locationRepo: ILocationRepository,
  ) {}

  async execute(input: CreateShiftInput): Promise<ShiftEntity> {
    const location = await this.locationRepo.findById(input.locationId);
    if (!location) throw new NotFoundException('Location not found');

    const shiftId = randomUUID();
    const shift = ShiftEntity.create(
      {
        locationId: input.locationId,
        startTime: input.startTime,
        endTime: input.endTime,
        requiredSkill: input.requiredSkill,
        headcount: input.headcount,
        status: 'DRAFT',
        scheduleWeek: input.scheduleWeek ?? getWeekStart(input.startTime),
        publishedAt: null,
        editCutoffHours: input.editCutoffHours ?? 48,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      shiftId,
    );

    const saved = await this.shiftRepo.save(shift);

    // Persist domain events to event store
    for (const event of shift.domainEvents) {
      const version = await this.eventStore.getNextVersion(event.aggregateId);
      await this.eventStore.append([
        {
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          version,
          payload: event.payload,
          metadata: { userId: input.createdBy, occurredAt: event.occurredAt.toISOString() },
          occurredAt: event.occurredAt,
        },
      ]);
    }
    shift.clearEvents();

    return saved;
  }
}
