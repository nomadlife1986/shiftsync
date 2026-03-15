import { AggregateRoot } from '../../common/aggregate-root.base';

export interface SwapRequestProps {
  shiftId: string;
  requesterId: string;
  targetId: string | null;
  status: 'PENDING_ACCEPTANCE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  targetAccepted: boolean | null;
  managerApproved: boolean | null;
  managerId: string | null;
  managerNote: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SwapRequestEntity extends AggregateRoot<SwapRequestProps> {
  get shiftId(): string { return this.props.shiftId; }
  get requesterId(): string { return this.props.requesterId; }
  get targetId(): string | null { return this.props.targetId; }
  get status(): string { return this.props.status; }
  get targetAccepted(): boolean | null { return this.props.targetAccepted; }
  get managerApproved(): boolean | null { return this.props.managerApproved; }
  get managerId(): string | null { return this.props.managerId; }
  get managerNote(): string | null { return this.props.managerNote; }
  get cancelledBy(): string | null { return this.props.cancelledBy; }
  get cancelReason(): string | null { return this.props.cancelReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(props: SwapRequestProps, id: string): SwapRequestEntity {
    return new SwapRequestEntity(props, id);
  }

  static reconstitute(props: SwapRequestProps, id: string): SwapRequestEntity {
    return new SwapRequestEntity(props, id);
  }

  isPending(): boolean {
    return this.props.status === 'PENDING_ACCEPTANCE' || this.props.status === 'PENDING_APPROVAL';
  }

  accept(): void {
    if (this.props.status !== 'PENDING_ACCEPTANCE') {
      throw new Error('Can only accept swaps in PENDING_ACCEPTANCE status');
    }
    this.props.targetAccepted = true;
    this.props.status = 'PENDING_APPROVAL';
    this.props.updatedAt = new Date();
  }

  approve(managerId: string, note?: string): void {
    if (this.props.status !== 'PENDING_APPROVAL') {
      throw new Error('Can only approve swaps in PENDING_APPROVAL status');
    }
    this.props.managerApproved = true;
    this.props.managerId = managerId;
    this.props.managerNote = note ?? null;
    this.props.status = 'APPROVED';
    this.props.updatedAt = new Date();
  }

  reject(managerId: string, note?: string): void {
    if (this.props.status !== 'PENDING_APPROVAL' && this.props.status !== 'PENDING_ACCEPTANCE') {
      throw new Error('Can only reject pending swaps');
    }
    this.props.managerApproved = false;
    this.props.managerId = managerId;
    this.props.managerNote = note ?? null;
    this.props.status = 'REJECTED';
    this.props.updatedAt = new Date();
  }

  cancel(userId: string, reason?: string): void {
    if (this.props.status === 'APPROVED' || this.props.status === 'REJECTED') {
      throw new Error('Cannot cancel resolved swaps');
    }
    this.props.cancelledBy = userId;
    this.props.cancelReason = reason ?? null;
    this.props.status = 'CANCELLED';
    this.props.updatedAt = new Date();
  }

  autoCancelDueToShiftEdit(): void {
    if (!this.isPending()) return;
    this.props.cancelledBy = 'SYSTEM';
    this.props.cancelReason = 'Shift was modified while swap was pending';
    this.props.status = 'CANCELLED';
    this.props.updatedAt = new Date();
  }

  expire(): void {
    if (!this.isPending()) return;
    this.props.status = 'EXPIRED';
    this.props.updatedAt = new Date();
  }
}
