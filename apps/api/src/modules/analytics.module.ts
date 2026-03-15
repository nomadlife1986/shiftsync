import { Module } from '@nestjs/common';
import { GetFairnessReportUseCase } from '../application/analytics/get-fairness-report.use-case';
import { GetOnDutyNowUseCase } from '../application/analytics/get-on-duty-now.use-case';
import { GetOvertimeDashboardUseCase } from '../application/compliance/get-overtime-dashboard.use-case';
import { CheckOvertimeImpactUseCase } from '../application/compliance/check-overtime-impact.use-case';
import { GetShiftHistoryUseCase } from '../application/audit/get-shift-history.use-case';
import { QueryEventsUseCase } from '../application/audit/query-events.use-case';
import { AnalyticsResolver } from '../presentation/graphql/resolvers/analytics.resolver';
import { AuditResolver } from '../presentation/graphql/resolvers/audit.resolver';
import { EventStoreModule } from './event-store.module';
import { SchedulingModule } from './scheduling.module';
import { UserModule } from './user.module';

@Module({
  imports: [EventStoreModule, SchedulingModule, UserModule],
  providers: [
    GetFairnessReportUseCase,
    GetOnDutyNowUseCase,
    GetOvertimeDashboardUseCase,
    CheckOvertimeImpactUseCase,
    GetShiftHistoryUseCase,
    QueryEventsUseCase,
    AnalyticsResolver,
    AuditResolver,
  ],
})
export class AnalyticsModule {}
