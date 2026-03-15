import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/drop-request.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class ExpireDropsUseCase implements IUseCase<void, number> {
  constructor(
    @Inject(DROP_REQUEST_REPOSITORY) private readonly dropRepo: IDropRequestRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
  ) {}

  async execute(): Promise<number> {
    const expiredDrops = await this.dropRepo.findExpired();
    let count = 0;

    for (const drop of expiredDrops) {
      drop.expire();
      await this.dropRepo.save(drop);
      count++;

      // Notify requester
      const notification = NotificationEntity.create(
        {
          userId: drop.requesterId,
          type: 'DROP_REQUEST_EXPIRED',
          title: 'Drop Request Expired',
          message: 'Your shift drop request has expired without being picked up',
          data: { dropId: drop.id, shiftId: drop.shiftId },
          isRead: false,
          createdAt: new Date(),
        },
        randomUUID(),
      );
      await this.notificationRepo.save(notification);
      this.realtimeService.emitNotification(drop.requesterId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      });
    }

    return count;
  }
}
