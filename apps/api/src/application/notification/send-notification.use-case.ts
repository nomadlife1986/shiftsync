import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';

export interface SendNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class SendNotificationUseCase implements IUseCase<SendNotificationInput, NotificationEntity> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
  ) {}

  async execute(input: SendNotificationInput): Promise<NotificationEntity> {
    const notification = NotificationEntity.create(
      {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? null,
        isRead: false,
        createdAt: new Date(),
      },
      randomUUID(),
    );

    const saved = await this.notificationRepo.save(notification);

    this.realtimeService.emitNotification(input.userId, {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      message: saved.message,
    });

    return saved;
  }
}
