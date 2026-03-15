import { Module } from '@nestjs/common';
import { SHIFT_REPOSITORY } from '../domain/scheduling/repositories/shift.repository.interface';
import { ASSIGNMENT_REPOSITORY } from '../domain/scheduling/repositories/assignment.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../domain/notification/repositories/notification.repository.interface';
import { PrismaShiftRepository } from '../infrastructure/persistence/repositories/prisma-shift.repository';
import { PrismaAssignmentRepository } from '../infrastructure/persistence/repositories/prisma-assignment.repository';
import { PrismaNotificationRepository } from '../infrastructure/persistence/repositories/prisma-notification.repository';
import { CreateShiftUseCase } from '../application/scheduling/create-shift.use-case';
import { UpdateShiftUseCase } from '../application/scheduling/update-shift.use-case';
import { DeleteShiftUseCase } from '../application/scheduling/delete-shift.use-case';
import { AssignStaffUseCase } from '../application/scheduling/assign-staff.use-case';
import { UnassignStaffUseCase } from '../application/scheduling/unassign-staff.use-case';
import { PublishScheduleUseCase } from '../application/scheduling/publish-schedule.use-case';
import { UnpublishScheduleUseCase } from '../application/scheduling/unpublish-schedule.use-case';
import { GetWeekScheduleUseCase } from '../application/scheduling/get-week-schedule.use-case';
import { WhatIfAssignmentUseCase } from '../application/scheduling/what-if-assignment.use-case';
import { GetShiftHistoryUseCase } from '../application/audit/get-shift-history.use-case';
import { ShiftResolver } from '../presentation/graphql/resolvers/shift.resolver';
import { EventStoreModule } from './event-store.module';
import { LocationModule } from './location.module';
import { RealtimeModule } from './realtime.module';
import { UserModule } from './user.module';

@Module({
  imports: [EventStoreModule, LocationModule, RealtimeModule, UserModule],
  providers: [
    { provide: SHIFT_REPOSITORY, useClass: PrismaShiftRepository },
    { provide: ASSIGNMENT_REPOSITORY, useClass: PrismaAssignmentRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    CreateShiftUseCase,
    UpdateShiftUseCase,
    DeleteShiftUseCase,
    AssignStaffUseCase,
    UnassignStaffUseCase,
    PublishScheduleUseCase,
    UnpublishScheduleUseCase,
    GetWeekScheduleUseCase,
    WhatIfAssignmentUseCase,
    GetShiftHistoryUseCase,
    ShiftResolver,
  ],
  exports: [SHIFT_REPOSITORY, ASSIGNMENT_REPOSITORY, NOTIFICATION_REPOSITORY],
})
export class SchedulingModule {}
