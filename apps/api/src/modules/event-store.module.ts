import { Module } from '@nestjs/common';
import { EVENT_STORE_REPOSITORY } from '../domain/event-store/repositories/event-store.repository.interface';
import { PrismaEventStoreRepository } from '../infrastructure/persistence/repositories/prisma-event-store.repository';

@Module({
  providers: [
    { provide: EVENT_STORE_REPOSITORY, useClass: PrismaEventStoreRepository },
  ],
  exports: [EVENT_STORE_REPOSITORY],
})
export class EventStoreModule {}
