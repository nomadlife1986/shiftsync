import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';

export interface GetNotificationsInput {
  userId: string;
  unreadOnly?: boolean;
}

export interface GetNotificationsOutput {
  notifications: NotificationEntity[];
  unreadCount: number;
}

@Injectable()
export class GetNotificationsUseCase implements IUseCase<GetNotificationsInput, GetNotificationsOutput> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(input: GetNotificationsInput): Promise<GetNotificationsOutput> {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepo.findByUserId(input.userId, { unreadOnly: input.unreadOnly }),
      this.notificationRepo.countUnread(input.userId),
    ]);

    return { notifications, unreadCount };
  }
}
