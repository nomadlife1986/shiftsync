import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { ISwapRequestRepository, SWAP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/swap-request.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { SwapRequestEntity } from '../../domain/coverage/entities/swap-request.entity';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';

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
  ) {}

  async execute(input: ApproveSwapInput): Promise<SwapRequestEntity> {
    const swap = await this.swapRepo.findById(input.swapId);
    if (!swap) throw new NotFoundException('Swap request not found');

    swap.approve(input.managerId, input.note);

    // Perform the actual swap of assignments
    if (swap.targetId) {
      const assignments = await this.assignmentRepo.findByShiftId(swap.shiftId);
      const requesterAssignment = assignments.find(
        (a) => a.userId === swap.requesterId && a.isActive(),
      );
      if (!requesterAssignment) {
        throw new BadRequestException('Requester no longer has an active assignment');
      }

      // Remove requester's assignment and create one for target
      requesterAssignment.markCancelled();
      await this.assignmentRepo.save(requesterAssignment);

      // Create new assignment for target
      const { AssignmentEntity } = await import('../../domain/scheduling/entities/assignment.entity');
      const newAssignment = AssignmentEntity.create(
        {
          shiftId: swap.shiftId,
          userId: swap.targetId,
          status: 'ASSIGNED',
          assignedBy: input.managerId,
          assignedAt: new Date(),
        },
        randomUUID(),
      );
      await this.assignmentRepo.save(newAssignment);
    }

    const saved = await this.swapRepo.save(swap);

    // Notify requester
    const requesterNotification = NotificationEntity.create(
      {
        userId: swap.requesterId,
        type: 'SWAP_REQUEST_APPROVED',
        title: 'Swap Approved',
        message: 'Your swap request has been approved by a manager',
        data: { swapId: saved.id, shiftId: swap.shiftId },
        isRead: false,
        createdAt: new Date(),
      },
      randomUUID(),
    );
    await this.notificationRepo.save(requesterNotification);
    this.realtimeService.emitNotification(swap.requesterId, {
      id: requesterNotification.id,
      type: requesterNotification.type,
      title: requesterNotification.title,
      message: requesterNotification.message,
    });

    // Notify target if exists
    if (swap.targetId) {
      const targetNotification = NotificationEntity.create(
        {
          userId: swap.targetId,
          type: 'SWAP_REQUEST_APPROVED',
          title: 'Swap Approved',
          message: 'The swap request has been approved. You are now assigned to this shift.',
          data: { swapId: saved.id, shiftId: swap.shiftId },
          isRead: false,
          createdAt: new Date(),
        },
        randomUUID(),
      );
      await this.notificationRepo.save(targetNotification);
      this.realtimeService.emitNotification(swap.targetId, {
        id: targetNotification.id,
        type: targetNotification.type,
        title: targetNotification.title,
        message: targetNotification.message,
      });
    }

    return saved;
  }
}
