import { AggregateRoot } from '../../common/aggregate-root.base';

export interface NotificationProps {
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export class NotificationEntity extends AggregateRoot<NotificationProps> {
  get userId(): string { return this.props.userId; }
  get type(): string { return this.props.type; }
  get title(): string { return this.props.title; }
  get message(): string { return this.props.message; }
  get data(): Record<string, unknown> | null { return this.props.data; }
  get isRead(): boolean { return this.props.isRead; }
  get createdAt(): Date { return this.props.createdAt; }

  static create(props: NotificationProps, id: string): NotificationEntity {
    return new NotificationEntity(props, id);
  }

  static reconstitute(props: NotificationProps, id: string): NotificationEntity {
    return new NotificationEntity(props, id);
  }

  markAsRead(): void {
    this.props.isRead = true;
    this.props.updatedAt = new Date();
  }
}
