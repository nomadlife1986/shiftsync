import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { ISwapRequestRepository, SWAP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/swap-request.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { SwapRequestEntity } from '../../domain/coverage/entities/swap-request.entity';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface AcceptSwapInput {
  swapId: string;
  userId: string;
}

@Injectable()
export class AcceptSwapUseCase implements IUseCase<AcceptSwapInput, SwapRequestEntity> {
  constructor(
    @Inject(SWAP_REQUEST_REPOSITORY) private readonly swapRepo: ISwapRequestRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: AcceptSwapInput): Promise<SwapRequestEntity> {
    const swap = await this.swapRepo.findById(input.swapId);
    if (!swap) throw new NotFoundException('Swap request not found');

    if (swap.targetId !== input.userId) {
      throw new BadRequestException('Only the target can accept this swap');
    }

    swap.accept();

    // Notify requester that swap was accepted
    const notification = NotificationEntity.create(
      {
        userId: swap.requesterId,
        type: 'SWAP_REQUEST_ACCEPTED',
        title: 'Swap Accepted',
        message: 'Your swap request has been accepted and is pending manager approval',
        data: { swapId: swap.id, shiftId: swap.shiftId },
        isRead: false,
        createdAt: new Date(),
      },
        randomUUID(),
    );
    await this.prisma.$transaction(async (tx) => {
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
    this.realtimeService.emitNotification(swap.requesterId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
    });

    return this.swapRepo.findById(swap.id) as Promise<SwapRequestEntity>;
  }
}
