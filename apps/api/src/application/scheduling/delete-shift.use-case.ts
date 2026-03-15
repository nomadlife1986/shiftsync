import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';

export interface DeleteShiftInput { id: string; requestedBy: string; }

@Injectable()
export class DeleteShiftUseCase implements IUseCase<DeleteShiftInput, boolean> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private shiftRepo: IShiftRepository,
    @Inject(EVENT_STORE_REPOSITORY) private eventStore: IEventStoreRepository,
  ) {}

  async execute(input: DeleteShiftInput): Promise<boolean> {
    const shift = await this.shiftRepo.findById(input.id);
    if (!shift) throw new NotFoundException('Shift not found');
    if (!shift.canEdit()) throw new ForbiddenException('Shift cannot be deleted after cutoff');
    shift.cancel();
    await this.shiftRepo.save(shift);
    const version = await this.eventStore.getNextVersion(shift.id);
    await this.eventStore.append([{
      aggregateId: shift.id, aggregateType: 'Shift', eventType: 'ShiftCancelled', version,
      payload: { shiftId: shift.id }, metadata: { userId: input.requestedBy, occurredAt: new Date().toISOString() }, occurredAt: new Date(),
    }]);
    return true;
  }
}
