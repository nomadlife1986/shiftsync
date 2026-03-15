import { Module } from '@nestjs/common';
import { PubSubService } from '../infrastructure/realtime/pubsub.service';
import { RealtimeService } from '../infrastructure/realtime/realtime.service';
import { EventsGateway } from '../infrastructure/realtime/events.gateway';
import { REALTIME_SERVICE } from '../application/common/interfaces';

@Module({
  providers: [
    PubSubService,
    EventsGateway,
    { provide: REALTIME_SERVICE, useClass: RealtimeService },
  ],
  exports: [PubSubService, REALTIME_SERVICE],
})
export class RealtimeModule {}
