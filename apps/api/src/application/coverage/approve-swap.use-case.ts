import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { ISwapRequestRepository, SWAP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/swap-request.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { SwapRequestEntity } from '../../domain/coverage/entities/swap-request.entity';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface ApproveSwapInput {
  swapId: string;
  managerId: string;
  note?: string;
}

@Injectable()
export class ApproveSwapUseCase implements IUseCase<ApproveSwapInput, SwapRequestEntity> {
  constructor(
    @Inject(SWAP_REQUEST_REPOSITORY) private readonly swapRepo: ISwapRequestRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ApproveSwapInput): Promise<SwapRequestEntity> {
    const swap = await this.swapRepo.findById(input.swapId);
    if (!swap) throw new NotFoundException('Swap request not found');

    swap.approve(input.managerId, input.note);

    let requesterAssignment: any = null;
    if (swap.targetId) {
      const assignments = await this.assignmentRepo.findByShiftId(swap.shiftId);
      requesterAssignment = assignments.find(
        (a) => a.userId === swap.requesterId && a.isActive(),
      );
      if (!requesterAssignment) {
        throw new BadRequestException('Requester no longer has an active assignment');
      }
    }

    // Notify requester
    const requesterNotification = NotificationEntity.create(
      {
        userId: swap.requesterId,
        type: 'SWAP_REQUEST_APPROVED',
        title: 'Swap Approved',
        message: 'Your swap request has been approved by a manager',
        data: { swapId: swap.id, shiftId: swap.shiftId },
        isRead: false,
        createdAt: new Date(),
      },
      randomUUID(),
    );

    let targetNotification: NotificationEntity | null = null;
    if (swap.targetId) {
      targetNotification = NotificationEntity.create(
        {
          userId: swap.targetId,
          type: 'SWAP_REQUEST_APPROVED',
          title: 'Swap Approved',
          message: 'The swap request has been approved. You are now assigned to this shift.',
          data: { swapId: swap.id, shiftId: swap.shiftId },
          isRead: false,
          createdAt: new Date(),
        },
        randomUUID(),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (swap.targetId && requesterAssignment) {
        await tx.assignment.update({
          where: { id: requesterAssignment.id },
          data: { status: 'CANCELLED', assignedBy: requesterAssignment.assignedBy },
        });

        const existingByPair = await tx.assignment.findFirst({
          where: { shiftId: swap.shiftId, userId: swap.targetId },
        });
        if (existingByPair) {
          await tx.assignment.update({
            where: { id: existingByPair.id },
            data: { status: 'ASSIGNED', assignedBy: input.managerId },
          });
        } else {
          await tx.assignment.create({
            data: {
              id: randomUUID(),
              shiftId: swap.shiftId,
              userId: swap.targetId,
              status: 'ASSIGNED',
              assignedBy: input.managerId,
            },
          });
        }
      }

      await tx.swapRequest.update({
        where: { id: swap.id },
        data: {
          status: swap.status as any,
          targetAccepted: swap.targetAccepted,
          managerApproved: swap.managerApproved,
          managerId: swap.managerId,
          managerNote: swap.managerNote,
          cancelledBy: swap.cancelledBy,
          cancelReason: swap.cancelReason,
        },
      });

      await tx.notification.create({
        data: {
          id: requesterNotification.id,
          userId: requesterNotification.userId,
          type: requesterNotification.type as any,
          title: requesterNotification.title,
          message: requesterNotification.message,
          data: requesterNotification.data as any,
          isRead: requesterNotification.isRead,
          createdAt: requesterNotification.createdAt,
        },
      });
      if (targetNotification) {
        await tx.notification.create({
          data: {
            id: targetNotification.id,
            userId: targetNotification.userId,
            type: targetNotification.type as any,
            title: targetNotification.title,
            message: targetNotification.message,
            data: targetNotification.data as any,
            isRead: targetNotification.isRead,
            createdAt: targetNotification.createdAt,
          },
        });
      }
    });

    this.realtimeService.emitNotification(swap.requesterId, {
      id: requesterNotification.id,
      type: requesterNotification.type,
      title: requesterNotification.title,
      message: requesterNotification.message,
    });
    if (targetNotification && swap.targetId) {
      this.realtimeService.emitNotification(swap.targetId, {
        id: targetNotification.id,
        type: targetNotification.type,
        title: targetNotification.title,
        message: targetNotification.message,
      });
    }

    return this.swapRepo.findById(swap.id) as Promise<SwapRequestEntity>;
  }
}
