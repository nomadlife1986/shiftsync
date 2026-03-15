import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/drop-request.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { DropRequestEntity } from '../../domain/coverage/entities/drop-request.entity';
import { AssignmentEntity } from '../../domain/scheduling/entities/assignment.entity';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface ApproveDropInput {
  dropId: string;
  managerId: string;
  note?: string;
}

@Injectable()
export class ApproveDropUseCase implements IUseCase<ApproveDropInput, DropRequestEntity> {
  constructor(
    @Inject(DROP_REQUEST_REPOSITORY) private readonly dropRepo: IDropRequestRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ApproveDropInput): Promise<DropRequestEntity> {
    const drop = await this.dropRepo.findById(input.dropId);
    if (!drop) throw new NotFoundException('Drop request not found');

    drop.approve(input.managerId, input.note);

    let pickerNotification: NotificationEntity | null = null;
    if (drop.pickedUpById) {
      const newAssignment = AssignmentEntity.create(
        {
          shiftId: drop.shiftId,
          userId: drop.pickedUpById,
          status: 'ASSIGNED',
          assignedBy: input.managerId,
          assignedAt: new Date(),
        },
        randomUUID(),
      );
      pickerNotification = NotificationEntity.create(
        {
          userId: drop.pickedUpById,
          type: 'DROP_REQUEST_APPROVED',
          title: 'Drop Approved',
          message: 'The drop request you picked up has been approved. You are now assigned to this shift.',
          data: { dropId: drop.id, shiftId: drop.shiftId },
          isRead: false,
          createdAt: new Date(),
        },
        randomUUID(),
      );
    }

    // Notify requester
    const notification = NotificationEntity.create(
      {
        userId: drop.requesterId,
        type: 'DROP_REQUEST_APPROVED',
        title: 'Drop Approved',
        message: 'Your shift drop request has been approved by a manager',
        data: { dropId: drop.id, shiftId: drop.shiftId },
        isRead: false,
        createdAt: new Date(),
      },
      randomUUID(),
    );
    await this.prisma.$transaction(async (tx) => {
      if (drop.pickedUpById) {
        const existingByPair = await tx.assignment.findFirst({
          where: { shiftId: drop.shiftId, userId: drop.pickedUpById },
        });
        if (existingByPair) {
          await tx.assignment.update({
            where: { id: existingByPair.id },
            data: {
              status: 'ASSIGNED',
              assignedBy: input.managerId,
            },
          });
        } else {
          await tx.assignment.create({
            data: {
              id: randomUUID(),
              shiftId: drop.shiftId,
              userId: drop.pickedUpById,
              status: 'ASSIGNED',
              assignedBy: input.managerId,
            },
          });
        }
      }

      await tx.dropRequest.update({
        where: { id: drop.id },
        data: {
          status: drop.status as any,
          pickedUpById: drop.pickedUpById,
          managerId: drop.managerId,
          managerNote: drop.managerNote,
          expiresAt: drop.expiresAt,
        },
      });

      if (pickerNotification) {
        await tx.notification.create({
          data: {
            id: pickerNotification.id,
            userId: pickerNotification.userId,
            type: pickerNotification.type as any,
            title: pickerNotification.title,
            message: pickerNotification.message,
            data: pickerNotification.data as any,
            isRead: pickerNotification.isRead,
            createdAt: pickerNotification.createdAt,
          },
        });
      }

      await tx.notification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
          data: notification.data as any,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        },
      });
    });

    if (pickerNotification && drop.pickedUpById) {
      this.realtimeService.emitNotification(drop.pickedUpById, {
        id: pickerNotification.id,
        type: pickerNotification.type,
        title: pickerNotification.title,
        message: pickerNotification.message,
      });
    }
    this.realtimeService.emitNotification(drop.requesterId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
    });

    return this.dropRepo.findById(drop.id) as Promise<DropRequestEntity>;
  }
}
