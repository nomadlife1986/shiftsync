import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INotificationRepository } from '../../../domain/notification/repositories/notification.repository.interface';
import { NotificationEntity } from '../../../domain/notification/entities/notification.entity';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private prisma: PrismaService) {}

  private toEntity(n: any): NotificationEntity {
    return NotificationEntity.reconstitute({
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data as Record<string, unknown>,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }, n.id);
  }

  async findByUserId(userId: string, filter?: { unreadOnly?: boolean }): Promise<NotificationEntity[]> {
    const where: any = { userId };
    if (filter?.unreadOnly) where.isRead = false;
    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return notifications.map(n => this.toEntity(n));
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    if (!id) return null;
    const n = await this.prisma.notification.findUnique({ where: { id } });
    return n ? this.toEntity(n) : null;
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(id: string): Promise<void> {
    await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async save(notification: NotificationEntity): Promise<NotificationEntity> {
    const existing = await this.prisma.notification.findUnique({ where: { id: notification.id } });
    const data = {
      userId: notification.userId,
      type: notification.type as any,
      title: notification.title,
      message: notification.message,
      data: notification.data as any,
      isRead: notification.isRead,
    };
    if (!existing) {
      await this.prisma.notification.create({ data: { ...data, id: notification.id, createdAt: notification.createdAt } });
    } else {
      await this.prisma.notification.update({ where: { id: notification.id }, data });
    }
    return this.findById(notification.id) as Promise<NotificationEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({ where: { id } });
  }
}
