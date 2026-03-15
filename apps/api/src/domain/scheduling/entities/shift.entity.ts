import { AggregateRoot } from '../../common/aggregate-root.base';
import { ShiftCreatedEvent } from '../events/shift-created.event';
import { ShiftPublishedEvent } from '../events/shift-published.event';

export interface ShiftProps {
  locationId: string;
  startTime: Date;
  endTime: Date;
  requiredSkill: string;
  headcount: number;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  scheduleWeek: Date | null;
  publishedAt: Date | null;
  editCutoffHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ShiftEntity extends AggregateRoot<ShiftProps> {
  get locationId(): string { return this.props.locationId; }
  get startTime(): Date { return this.props.startTime; }
  get endTime(): Date { return this.props.endTime; }
  get requiredSkill(): string { return this.props.requiredSkill; }
  get headcount(): number { return this.props.headcount; }
  get status(): string { return this.props.status; }
  get scheduleWeek(): Date | null { return this.props.scheduleWeek; }
  get publishedAt(): Date | null { return this.props.publishedAt; }
  get editCutoffHours(): number { return this.props.editCutoffHours; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(props: ShiftProps, id: string): ShiftEntity {
    const shift = new ShiftEntity(props, id);
    shift.addDomainEvent(new ShiftCreatedEvent(id, props.locationId));
    return shift;
  }

  static reconstitute(props: ShiftProps, id: string): ShiftEntity {
    return new ShiftEntity(props, id);
  }

  getDurationHours(): number {
    return (this.props.endTime.getTime() - this.props.startTime.getTime()) / (1000 * 60 * 60);
  }

  isOvernight(): boolean {
    return this.props.endTime.getUTCDate() !== this.props.startTime.getUTCDate() ||
           this.props.endTime.getTime() < this.props.startTime.getTime();
  }

  isPublished(): boolean {
    return this.props.status === 'PUBLISHED';
  }

  isDraft(): boolean {
    return this.props.status === 'DRAFT';
  }

  canEdit(): boolean {
    if (this.props.status === 'CANCELLED' || this.props.status === 'COMPLETED') return false;
    if (!this.isPublished()) return true;
    const cutoff = new Date(this.props.startTime.getTime() - this.props.editCutoffHours * 60 * 60 * 1000);
    return new Date() < cutoff;
  }

  isPremiumShift(localHour?: number): boolean {
    const hour = localHour ?? this.props.startTime.getUTCHours();
    const day = this.props.startTime.getUTCDay();
    // Friday (5) or Saturday (6) starting at or after 5pm
    return (day === 5 || day === 6) && hour >= 17;
  }

  publish(): void {
    if (this.props.status !== 'DRAFT') {
      throw new Error('Only draft shifts can be published');
    }
    this.props.status = 'PUBLISHED';
    this.props.publishedAt = new Date();
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ShiftPublishedEvent(this.id, this.props.locationId));
  }

  unpublish(): void {
    if (this.props.status !== 'PUBLISHED') {
      throw new Error('Only published shifts can be unpublished');
    }
    if (!this.canEdit()) {
      throw new Error('Cannot unpublish after edit cutoff');
    }
    this.props.status = 'DRAFT';
    this.props.publishedAt = null;
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    this.props.status = 'CANCELLED';
    this.props.updatedAt = new Date();
  }

  update(data: Partial<Pick<ShiftProps, 'startTime' | 'endTime' | 'requiredSkill' | 'headcount' | 'editCutoffHours'>>): void {
    if (!this.canEdit()) {
      throw new Error('Shift cannot be edited after cutoff');
    }
    if (data.startTime) this.props.startTime = data.startTime;
    if (data.endTime) this.props.endTime = data.endTime;
    if (data.requiredSkill) this.props.requiredSkill = data.requiredSkill;
    if (data.headcount) this.props.headcount = data.headcount;
    if (data.editCutoffHours !== undefined) this.props.editCutoffHours = data.editCutoffHours;
    this.props.updatedAt = new Date();
  }
}
