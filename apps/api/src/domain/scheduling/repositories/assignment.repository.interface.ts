import { AssignmentEntity } from '../entities/assignment.entity';

export interface IAssignmentRepository {
  findById(id: string): Promise<AssignmentEntity | null>;
  findByShiftId(shiftId: string): Promise<AssignmentEntity[]>;
  findByUserId(userId: string, dateRange?: { start: Date; end: Date }): Promise<AssignmentEntity[]>;
  findByUserAndWeek(userId: string, weekStart: Date): Promise<AssignmentEntity[]>;
  findByShiftIds(shiftIds: string[]): Promise<AssignmentEntity[]>;
  countByShiftId(shiftId: string): Promise<number>;
  save(assignment: AssignmentEntity): Promise<AssignmentEntity>;
  delete(id: string): Promise<void>;
}

export const ASSIGNMENT_REPOSITORY = 'IAssignmentRepository';
