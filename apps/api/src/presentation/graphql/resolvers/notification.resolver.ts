import { Resolver, Query, Mutation, Args, ID, Subscription } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/gql-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { NotificationType } from '../types/notification.type';
import { GetNotificationsUseCase } from '../../../application/notification/get-notifications.use-case';
import { MarkAsReadUseCase } from '../../../application/notification/mark-as-read.use-case';
import { PubSubService } from '../../../infrastructure/realtime/pubsub.service';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../../domain/notification/repositories/notification.repository.interface';

@Resolver(() => NotificationType)
@UseGuards(JwtAuthGuard)
export class NotificationResolver {
  constructor(
    private getNotifications: GetNotificationsUseCase,
    private markAsRead: MarkAsReadUseCase,
    private pubSub: PubSubService,
    @Inject(NOTIFICATION_REPOSITORY) private notificationRepo: INotificationRepository,
  ) {}

  @Query(() => [NotificationType])
  async notifications(
    @CurrentUser() user: { id: string },
    @Args('unreadOnly', { nullable: true }) unreadOnly?: boolean,
  ): Promise<NotificationType[]> {
    const result = await this.getNotifications.execute({ userId: user.id, unreadOnly });
    return result.notifications.map(n => ({ id: n.id, userId: n.userId, type: n.type, title: n.title, message: n.message, isRead: n.isRead, createdAt: n.createdAt }));
  }

  @Mutation(() => NotificationType)
  async markNotificationRead(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<NotificationType> {
    await this.markAsRead.execute({ notificationId: id });
    const n = await this.notificationRepo.findById(id);
    if (!n) throw new Error('Notification not found');
    return { id: n.id, userId: n.userId, type: n.type, title: n.title, message: n.message, isRead: n.isRead, createdAt: n.createdAt };
  }

  @Mutation(() => Boolean)
  async markAllNotificationsRead(@CurrentUser() user: { id: string }): Promise<boolean> {
    await this.notificationRepo.markAllRead(user.id);
    return true;
  }

  @Subscription(() => NotificationType, {
    filter: (payload, variables) => payload.newNotification.userId === variables.userId,
  })
  newNotification(@Args('userId', { type: () => ID }) userId: string) {
    return this.pubSub.asyncIterator(`newNotification:${userId}`);
  }
}
