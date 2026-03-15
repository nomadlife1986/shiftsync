import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { ShiftEntity } from '../../domain/scheduling/entities/shift.entity';
import { randomUUID } from 'crypto';

export interface UpdateShiftInput {
  id: string;
  startTime?: Date;
  endTime?: Date;
  requiredSkill?: string;
  headcount?: number;
  editCutoffHours?: number;
  requestedBy: string;
}

@Injectable()
export class UpdateShiftUseCase implements IUseCase<UpdateShiftInput, ShiftEntity> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private shiftRepo: IShiftRepository,
    @Inject(EVENT_STORE_REPOSITORY) private eventStore: IEventStoreRepository,
  ) {}

  async execute(input: UpdateShiftInput): Promise<ShiftEntity> {
    const shift = await this.shiftRepo.findById(input.id);
    if (!shift) throw new NotFoundException('Shift not found');
    if (!shift.canEdit()) throw new ForbiddenException('Shift cannot be edited after cutoff or when cancelled/completed');

    shift.update({
      startTime: input.startTime,
      endTime: input.endTime,
      requiredSkill: input.requiredSkill,
      headcount: input.headcount,
      editCutoffHours: input.editCutoffHours,
    });

    await this.shiftRepo.save(shift);

    const version = await this.eventStore.getNextVersion(shift.id);
    await this.eventStore.append([{
      aggregateId: shift.id,
      aggregateType: 'Shift',
      eventType: 'ShiftUpdated',
      version,
      payload: { shiftId: shift.id, changes: { startTime: input.startTime, endTime: input.endTime, requiredSkill: input.requiredSkill, headcount: input.headcount } },
      metadata: { userId: input.requestedBy, occurredAt: new Date().toISOString() },
      occurredAt: new Date(),
    }]);

    return shift;
  }
}
