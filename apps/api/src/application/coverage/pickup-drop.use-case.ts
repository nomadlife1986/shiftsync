import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/drop-request.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { CoverageEligibilityService } from '../../domain/coverage/services/coverage-eligibility.domain-service';
import { DropRequestEntity } from '../../domain/coverage/entities/drop-request.entity';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { randomUUID } from 'crypto';

export interface PickupDropInput {
  dropId: string;
  userId: string;
}

@Injectable()
export class PickupDropUseCase implements IUseCase<PickupDropInput, DropRequestEntity> {
  private eligibilityService = new CoverageEligibilityService();

  constructor(
    @Inject(DROP_REQUEST_REPOSITORY) private readonly dropRepo: IDropRequestRepository,
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
  ) {}

  async execute(input: PickupDropInput): Promise<DropRequestEntity> {
    const drop = await this.dropRepo.findById(input.dropId);
    if (!drop) throw new NotFoundException('Drop request not found');

    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new NotFoundException('User not found');

    const shift = await this.shiftRepo.findById(drop.shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    // Can't pick up your own drop
    if (drop.requesterId === input.userId) {
      throw new BadRequestException('You cannot pick up your own drop request');
    }

    // Check eligibility
    const eligibility = this.eligibilityService.canPickupDrop(user, shift);
    if (eligibility.isFailure) {
      throw new BadRequestException(eligibility.error.message);
    }

    drop.pickup(input.userId);
    const saved = await this.dropRepo.save(drop);

    // Notify requester
    const notification = NotificationEntity.create(
      {
        userId: drop.requesterId,
        type: 'DROP_REQUEST_PICKED_UP',
        title: 'Drop Picked Up',
        message: `${user.fullName} has picked up your shift. Pending manager approval.`,
        data: { dropId: saved.id, shiftId: drop.shiftId, pickedUpBy: input.userId },
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

    return saved;
  }
}
