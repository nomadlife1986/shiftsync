import { Module } from '@nestjs/common';
import { SWAP_REQUEST_REPOSITORY } from '../domain/coverage/repositories/swap-request.repository.interface';
import { DROP_REQUEST_REPOSITORY } from '../domain/coverage/repositories/drop-request.repository.interface';
import { PrismaSwapRequestRepository } from '../infrastructure/persistence/repositories/prisma-swap-request.repository';
import { PrismaDropRequestRepository } from '../infrastructure/persistence/repositories/prisma-drop-request.repository';
import { RequestSwapUseCase } from '../application/coverage/request-swap.use-case';
import { AcceptSwapUseCase } from '../application/coverage/accept-swap.use-case';
import { ApproveSwapUseCase } from '../application/coverage/approve-swap.use-case';
import { RejectSwapUseCase } from '../application/coverage/reject-swap.use-case';
import { CancelSwapUseCase } from '../application/coverage/cancel-swap.use-case';
import { RequestDropUseCase } from '../application/coverage/request-drop.use-case';
import { PickupDropUseCase } from '../application/coverage/pickup-drop.use-case';
import { ApproveDropUseCase } from '../application/coverage/approve-drop.use-case';
import { RejectDropUseCase } from '../application/coverage/reject-drop.use-case';
import { CancelDropUseCase } from '../application/coverage/cancel-drop.use-case';
import { ExpireDropsUseCase } from '../application/coverage/expire-drops.use-case';
import { DropExpiryCron } from '../infrastructure/scheduling/drop-expiry.cron';
import { CoverageResolver } from '../presentation/graphql/resolvers/coverage.resolver';
import { EventStoreModule } from './event-store.module';
import { SchedulingModule } from './scheduling.module';
import { UserModule } from './user.module';
import { RealtimeModule } from './realtime.module';

@Module({
  imports: [EventStoreModule, SchedulingModule, UserModule, RealtimeModule],
  providers: [
    { provide: SWAP_REQUEST_REPOSITORY, useClass: PrismaSwapRequestRepository },
    { provide: DROP_REQUEST_REPOSITORY, useClass: PrismaDropRequestRepository },
    RequestSwapUseCase,
    AcceptSwapUseCase,
    ApproveSwapUseCase,
    RejectSwapUseCase,
    CancelSwapUseCase,
    RequestDropUseCase,
    PickupDropUseCase,
    ApproveDropUseCase,
    RejectDropUseCase,
    CancelDropUseCase,
    ExpireDropsUseCase,
    DropExpiryCron,
    CoverageResolver,
  ],
  exports: [SWAP_REQUEST_REPOSITORY, DROP_REQUEST_REPOSITORY],
})
export class CoverageModule {}
