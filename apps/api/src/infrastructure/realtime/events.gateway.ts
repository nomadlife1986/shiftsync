import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({ namespace: '/on-duty', cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('on-duty:subscribe')
  handleSubscribe(@MessageBody() data: { locationId: string }, @ConnectedSocket() client: Socket): void {
    client.join(`location:${data.locationId}`);
  }

  @SubscribeMessage('on-duty:unsubscribe')
  handleUnsubscribe(@MessageBody() data: { locationId: string }, @ConnectedSocket() client: Socket): void {
    client.leave(`location:${data.locationId}`);
  }

  emitOnDutyUpdate(locationId: string, currentStaff: unknown[]): void {
    this.server.to(`location:${locationId}`).emit('on-duty:update', { locationId, currentStaff });
  }
}
