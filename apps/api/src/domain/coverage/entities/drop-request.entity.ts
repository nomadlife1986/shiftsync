import { AggregateRoot } from '../../common/aggregate-root.base';

export interface DropRequestProps {
  shiftId: string;
  requesterId: string;
  status: 'OPEN' | 'PICKED_UP_PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  pickedUpById: string | null;
  managerId: string | null;
  managerNote: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DropRequestEntity extends AggregateRoot<DropRequestProps> {
  get shiftId(): string { return this.props.shiftId; }
  get requesterId(): string { return this.props.requesterId; }
  get status(): string { return this.props.status; }
  get pickedUpById(): string | null { return this.props.pickedUpById; }
  get managerId(): string | null { return this.props.managerId; }
  get managerNote(): string | null { return this.props.managerNote; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(props: DropRequestProps, id: string): DropRequestEntity {
    return new DropRequestEntity(props, id);
  }

  static reconstitute(props: DropRequestProps, id: string): DropRequestEntity {
    return new DropRequestEntity(props, id);
  }

  static calculateExpiresAt(shiftStartTime: Date): Date {
    return new Date(shiftStartTime.getTime() - 24 * 60 * 60 * 1000);
  }

  isOpen(): boolean { return this.props.status === 'OPEN'; }
  isPending(): boolean { return this.props.status === 'OPEN' || this.props.status === 'PICKED_UP_PENDING'; }
  isExpired(): boolean { return new Date() >= this.props.expiresAt && this.props.status === 'OPEN'; }

  pickup(userId: string): void {
    if (this.props.status !== 'OPEN') throw new Error('Can only pick up OPEN drop requests');
    if (this.isExpired()) throw new Error('Drop request has expired');
    this.props.pickedUpById = userId;
    this.props.status = 'PICKED_UP_PENDING';
    this.props.updatedAt = new Date();
  }

  approve(managerId: string, note?: string): void {
    if (this.props.status !== 'PICKED_UP_PENDING') throw new Error('Can only approve picked-up drops');
    this.props.managerId = managerId;
    this.props.managerNote = note ?? null;
    this.props.status = 'APPROVED';
    this.props.updatedAt = new Date();
  }

  reject(managerId: string, note?: string): void {
    if (this.props.status !== 'PICKED_UP_PENDING' && this.props.status !== 'OPEN') {
      throw new Error('Can only reject pending drops');
    }
    this.props.managerId = managerId;
    this.props.managerNote = note ?? null;
    this.props.status = 'REJECTED';
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status === 'APPROVED' || this.props.status === 'REJECTED') {
      throw new Error('Cannot cancel resolved drops');
    }
    this.props.status = 'CANCELLED';
    this.props.updatedAt = new Date();
  }

  expire(): void {
    if (this.props.status !== 'OPEN') return;
    this.props.status = 'EXPIRED';
    this.props.updatedAt = new Date();
  }
}
