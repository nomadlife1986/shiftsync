import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { ShiftEntity } from '../../domain/scheduling/entities/shift.entity';

export interface PublishShiftInput {
  shiftId: string;
  publishedBy: string;
}

@Injectable()
export class PublishShiftUseCase implements IUseCase<PublishShiftInput, ShiftEntity> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(EVENT_STORE_REPOSITORY) private readonly eventStore: IEventStoreRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
  ) {}

  async execute(input: PublishShiftInput): Promise<ShiftEntity> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    shift.publish();
    const saved = await this.shiftRepo.save(shift);

    for (const event of shift.domainEvents) {
      const version = await this.eventStore.getNextVersion(event.aggregateId);
      await this.eventStore.append([{
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        version,
        payload: event.payload,
        metadata: { userId: input.publishedBy, occurredAt: event.occurredAt.toISOString() },
        occurredAt: event.occurredAt,
      }]);
    }
    shift.clearEvents();

    const weekStart = shift.scheduleWeek ?? shift.startTime;
    this.realtimeService.emitScheduleUpdate(
      shift.locationId,
      weekStart.toISOString().split('T')[0]!,
    );

    return saved;
  }
}
