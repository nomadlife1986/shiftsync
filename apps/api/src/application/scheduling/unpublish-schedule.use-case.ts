import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';

export interface UnpublishScheduleInput { locationId: string; week: Date; requestedBy: string; }

@Injectable()
export class UnpublishScheduleUseCase implements IUseCase<UnpublishScheduleInput, boolean> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private shiftRepo: IShiftRepository,
    @Inject(EVENT_STORE_REPOSITORY) private eventStore: IEventStoreRepository,
  ) {}

  async execute(input: UnpublishScheduleInput): Promise<boolean> {
    const shifts = await this.shiftRepo.findByWeekAndLocation(input.week, input.locationId);
    const published = shifts.filter(s => s.isPublished());
    for (const shift of published) {
      shift.unpublish();
      await this.shiftRepo.save(shift);
      const version = await this.eventStore.getNextVersion(shift.id);
      await this.eventStore.append([{
        aggregateId: shift.id, aggregateType: 'Shift', eventType: 'ShiftUnpublished', version,
        payload: { shiftId: shift.id }, metadata: { userId: input.requestedBy, occurredAt: new Date().toISOString() }, occurredAt: new Date(),
      }]);
    }
    return true;
  }
}
