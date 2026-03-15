import { Entity } from '../../common/entity.base';

export interface AssignmentProps {
  shiftId: string;
  userId: string;
  status: 'ASSIGNED' | 'SWAP_PENDING' | 'DROPPED' | 'COMPLETED' | 'CANCELLED';
  assignedBy: string;
  assignedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AssignmentEntity extends Entity<AssignmentProps> {
  get shiftId(): string { return this.props.shiftId; }
  get userId(): string { return this.props.userId; }
  get status(): string { return this.props.status; }
  get assignedBy(): string { return this.props.assignedBy; }
  get assignedAt(): Date { return this.props.assignedAt; }
  get createdAt(): Date { return this.props.createdAt ?? this.props.assignedAt; }
  get updatedAt(): Date { return this.props.updatedAt ?? this.props.assignedAt; }

  static create(props: AssignmentProps, id: string): AssignmentEntity {
    return new AssignmentEntity(props, id);
  }

  static reconstitute(props: AssignmentProps, id: string): AssignmentEntity {
    return new AssignmentEntity(props, id);
  }

  markSwapPending(): void { this.props.status = 'SWAP_PENDING'; }
  markDropped(): void { this.props.status = 'DROPPED'; }
  markCompleted(): void { this.props.status = 'COMPLETED'; }
  markCancelled(): void { this.props.status = 'CANCELLED'; }
  restore(): void { this.props.status = 'ASSIGNED'; }

  isActive(): boolean {
    return this.props.status === 'ASSIGNED' || this.props.status === 'SWAP_PENDING';
  }
}
