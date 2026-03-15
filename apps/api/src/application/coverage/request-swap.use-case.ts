import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { ISwapRequestRepository, SWAP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/swap-request.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { CoverageEligibilityService } from '../../domain/coverage/services/coverage-eligibility.domain-service';
import { SwapRequestEntity } from '../../domain/coverage/entities/swap-request.entity';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';

export interface RequestSwapInput {
  shiftId: string;
  requesterId: string;
  targetId?: string;
}

@Injectable()
export class RequestSwapUseCase implements IUseCase<RequestSwapInput, SwapRequestEntity> {
  private eligibilityService = new CoverageEligibilityService();

  constructor(
    @Inject(SWAP_REQUEST_REPOSITORY) private readonly swapRepo: ISwapRequestRepository,
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
  ) {}

  async execute(input: RequestSwapInput): Promise<SwapRequestEntity> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const requester = await this.userRepo.findById(input.requesterId);
    if (!requester) throw new NotFoundException('Requester not found');

    // Check the user is actually assigned to this shift
    const assignments = await this.assignmentRepo.findByShiftId(input.shiftId);
    const userAssignment = assignments.find(
      (a) => a.userId === input.requesterId && a.isActive(),
    );
    if (!userAssignment) throw new BadRequestException('You are not assigned to this shift');

    // Check eligibility (max 3 pending)
    const pendingCount = await this.swapRepo.countPendingByRequesterId(input.requesterId);
    const eligibility = this.eligibilityService.canRequestSwap(requester, shift, pendingCount);
    if (eligibility.isFailure) {
      throw new BadRequestException(eligibility.error.message);
    }

    if (input.targetId) {
      const target = await this.userRepo.findById(input.targetId);
      if (!target) throw new NotFoundException('Target user not found');
    }

    const swap = SwapRequestEntity.create(
      {
        shiftId: input.shiftId,
        requesterId: input.requesterId,
        targetId: input.targetId ?? null,
        status: input.targetId ? 'PENDING_ACCEPTANCE' : 'PENDING_APPROVAL',
        targetAccepted: null,
        managerApproved: null,
        managerId: null,
        managerNote: null,
        cancelledBy: null,
        cancelReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      randomUUID(),
    );

    const saved = await this.swapRepo.save(swap);

    // Notify target or managers
    if (input.targetId) {
      const notification = NotificationEntity.create(
        {
          userId: input.targetId,
          type: 'SWAP_REQUEST_RECEIVED',
          title: 'Swap Request',
          message: `${requester.fullName} wants to swap a shift with you`,
          data: { swapId: saved.id, shiftId: input.shiftId },
          isRead: false,
          createdAt: new Date(),
        },
        randomUUID(),
      );
      await this.notificationRepo.save(notification);
      this.realtimeService.emitNotification(input.targetId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      });
    }

    return saved;
  }
}
