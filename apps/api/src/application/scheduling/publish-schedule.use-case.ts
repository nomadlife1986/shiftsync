import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IEventStoreRepository, EVENT_STORE_REPOSITORY } from '../../domain/event-store/repositories/event-store.repository.interface';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/repositories/notification.repository.interface';
import { REALTIME_SERVICE, IRealtimeService } from '../common/interfaces';
import { NotificationEntity } from '../../domain/notification/entities/notification.entity';
import { ShiftEntity } from '../../domain/scheduling/entities/shift.entity';
import { randomUUID } from 'crypto';

export interface PublishScheduleInput {
  locationId: string;
  weekStart: Date;
  publishedBy: string;
}

export interface PublishScheduleOutput {
  publishedCount: number;
  shifts: ShiftEntity[];
}

@Injectable()
export class PublishScheduleUseCase implements IUseCase<PublishScheduleInput, PublishScheduleOutput> {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(EVENT_STORE_REPOSITORY) private readonly eventStore: IEventStoreRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    @Inject(REALTIME_SERVICE) private readonly realtimeService: IRealtimeService,
  ) {}

  async execute(input: PublishScheduleInput): Promise<PublishScheduleOutput> {
    const shifts = await this.shiftRepo.findByWeekAndLocation(input.weekStart, input.locationId);
    const draftShifts = shifts.filter((s) => s.isDraft());

    if (draftShifts.length === 0) {
      return { publishedCount: 0, shifts: [] };
    }

    const publishedShifts: ShiftEntity[] = [];
    const notifiedUserIds = new Set<string>();

    for (const shift of draftShifts) {
      shift.publish();
      const saved = await this.shiftRepo.save(shift);
      publishedShifts.push(saved);

      // Persist domain events
      for (const event of shift.domainEvents) {
        const version = await this.eventStore.getNextVersion(event.aggregateId);
        await this.eventStore.append([
          {
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            eventType: event.eventType,
            version,
            payload: event.payload,
            metadata: { userId: input.publishedBy, occurredAt: event.occurredAt.toISOString() },
            occurredAt: event.occurredAt,
          },
        ]);
      }
      shift.clearEvents();

      // Collect assigned user IDs for notification
      const assignments = await this.assignmentRepo.findByShiftId(shift.id);
      for (const assignment of assignments) {
        if (assignment.isActive()) {
          notifiedUserIds.add(assignment.userId);
        }
      }
    }

    // Notify all assigned staff
    for (const userId of notifiedUserIds) {
      const notification = NotificationEntity.create(
        {
          userId,
          type: 'SCHEDULE_PUBLISHED',
          title: 'Schedule Published',
          message: `The schedule for the week of ${input.weekStart.toISOString().split('T')[0]} has been published`,
          data: { locationId: input.locationId, weekStart: input.weekStart.toISOString() },
          isRead: false,
          createdAt: new Date(),
        },
        randomUUID(),
      );
      await this.notificationRepo.save(notification);
      this.realtimeService.emitNotification(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      });
    }

    this.realtimeService.emitScheduleUpdate(
      input.locationId,
      input.weekStart.toISOString().split('T')[0]!,
    );

    return { publishedCount: publishedShifts.length, shifts: publishedShifts };
  }
}
