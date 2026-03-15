import { Injectable } from '@nestjs/common';
import { IRealtimeService } from '../../application/common/interfaces';
import { PubSubService } from './pubsub.service';

@Injectable()
export class RealtimeService implements IRealtimeService {
  constructor(private pubSub: PubSubService) {}

  emitToUser(userId: string, event: string, data: unknown): void {
    this.pubSub.publish(`${event}:${userId}`, { [event]: data });
  }

  emitToRoom(room: string, event: string, data: unknown): void {
    this.pubSub.publish(`${event}:${room}`, { [event]: data });
  }

  emitScheduleUpdate(locationId: string, week: string): void {
    this.pubSub.publish('scheduleUpdated', { scheduleUpdated: { locationId, week } });
  }

  emitNotification(userId: string, notification: unknown): void {
    this.pubSub.publish(`newNotification:${userId}`, { newNotification: notification });
  }
}
