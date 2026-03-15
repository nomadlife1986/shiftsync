import { ShiftEntity } from '../entities/shift.entity';

export interface IShiftRepository {
  findById(id: string): Promise<ShiftEntity | null>;
  findByIds(ids: string[]): Promise<ShiftEntity[]>;
  findByWeekAndLocation(week: Date, locationId: string): Promise<ShiftEntity[]>;
  findOverlapping(userId: string, start: Date, end: Date, excludeShiftId?: string): Promise<ShiftEntity[]>;
  findByDateRange(start: Date, end: Date, locationId?: string): Promise<ShiftEntity[]>;
  save(shift: ShiftEntity): Promise<ShiftEntity>;
  delete(id: string): Promise<void>;
}

export const SHIFT_REPOSITORY = 'IShiftRepository';
