import { DropRequestEntity } from '../entities/drop-request.entity';

export interface IDropRequestRepository {
  findById(id: string): Promise<DropRequestEntity | null>;
  findByRequesterId(requesterId: string): Promise<DropRequestEntity[]>;
  findByShiftId(shiftId: string): Promise<DropRequestEntity[]>;
  findExpired(): Promise<DropRequestEntity[]>;
  findExpiring(beforeDate: Date): Promise<DropRequestEntity[]>;
  findAvailable(locationId?: string): Promise<DropRequestEntity[]>;
  findAll(filter?: { status?: string }): Promise<DropRequestEntity[]>;
  countPendingByRequesterId(requesterId: string): Promise<number>;
  save(drop: DropRequestEntity): Promise<DropRequestEntity>;
  delete(id: string): Promise<void>;
}

export const DROP_REQUEST_REPOSITORY = 'IDropRequestRepository';
