import { Module } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from '../domain/notification/repositories/notification.repository.interface';
import { PrismaNotificationRepository } from '../infrastructure/persistence/repositories/prisma-notification.repository';
import { GetNotificationsUseCase } from '../application/notification/get-notifications.use-case';
import { MarkAsReadUseCase } from '../application/notification/mark-as-read.use-case';
import { SendNotificationUseCase } from '../application/notification/send-notification.use-case';
import { NotificationResolver } from '../presentation/graphql/resolvers/notification.resolver';
import { RealtimeModule } from './realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    GetNotificationsUseCase,
    MarkAsReadUseCase,
    SendNotificationUseCase,
    NotificationResolver,
  ],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationModule {}
