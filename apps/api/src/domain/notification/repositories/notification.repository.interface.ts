import { NotificationEntity } from '../entities/notification.entity';

export interface INotificationRepository {
  findById(id: string): Promise<NotificationEntity | null>;
  findByUserId(userId: string, filter?: { unreadOnly?: boolean }): Promise<NotificationEntity[]>;
  countUnread(userId: string): Promise<number>;
  save(notification: NotificationEntity): Promise<NotificationEntity>;
  markAsRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = 'INotificationRepository';
