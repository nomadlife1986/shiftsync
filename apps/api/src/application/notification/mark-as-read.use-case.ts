import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';

export interface MarkAsReadInput {
  notificationId?: string;
  userId?: string;
  markAll?: boolean;
}

@Injectable()
export class MarkAsReadUseCase implements IUseCase<MarkAsReadInput, boolean> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(input: MarkAsReadInput): Promise<boolean> {
    if (input.markAll && input.userId) {
      await this.notificationRepo.markAllRead(input.userId);
      return true;
    }

    if (input.notificationId) {
      const notification = await this.notificationRepo.findById(input.notificationId);
      if (!notification) throw new NotFoundException('Notification not found');
      await this.notificationRepo.markAsRead(input.notificationId);
      return true;
    }

    return false;
  }
}
