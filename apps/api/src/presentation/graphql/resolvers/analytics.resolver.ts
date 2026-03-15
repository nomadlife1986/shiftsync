import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/gql-auth.guard';
import {
  FairnessReportType,
  OvertimeDashboardType,
  OnDutyEntryType,
  FairnessStaffType,
  OvertimeStaffEntryType,
} from '../types/analytics.type';
import { GetFairnessReportUseCase } from '../../../application/analytics/get-fairness-report.use-case';
import { GetOvertimeDashboardUseCase } from '../../../application/compliance/get-overtime-dashboard.use-case';
import { GetOnDutyNowUseCase } from '../../../application/analytics/get-on-duty-now.use-case';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AnalyticsResolver {
  constructor(
    private getFairnessReport: GetFairnessReportUseCase,
    private getOvertimeDashboard: GetOvertimeDashboardUseCase,
    private getOnDutyNow: GetOnDutyNowUseCase,
  ) {}

  @Query(() => FairnessReportType)
  async fairnessReport(
    @Args('locationId', { type: () => ID, nullable: true }) locationId: string | undefined,
    @Args('periodStart') periodStart: Date,
    @Args('periodEnd', { nullable: true }) periodEnd?: Date,
  ): Promise<FairnessReportType> {
    if (!locationId) {
      return { staff: [], averageHours: 0, fairnessScore: 100, standardDeviation: 0 };
    }
    const result = await this.getFairnessReport.execute({ locationId, weekStart: periodStart });
    const staff: FairnessStaffType[] = result.staffHours.map(s => ({
      userId: s.userId,
      firstName: s.firstName,
      lastName: s.lastName,
      totalHours: s.totalHours,
      desiredHours: s.desiredHours ?? undefined,
      premiumShifts: s.premiumShiftCount,
      delta: s.delta,
    }));
    return {
      staff,
      averageHours: result.averageHoursPerStaff,
      fairnessScore: result.fairnessScore,
      standardDeviation: result.standardDeviation,
    };
  }

  @Query(() => OvertimeDashboardType)
  async overtimeDashboard(
    @Args('week') week: Date,
    @Args('locationId', { type: () => ID, nullable: true }) locationId?: string,
  ): Promise<OvertimeDashboardType> {
    if (!locationId) {
      return { week, locationId: undefined, staff: [], atRiskCount: 0, overtimeCount: 0, totalProjectedCost: 0 };
    }
    const result = await this.getOvertimeDashboard.execute({ locationId, weekStart: week });
    const staff: OvertimeStaffEntryType[] = result.staffOvertime.map(entry => ({
      userId: entry.userId,
      firstName: entry.firstName,
      lastName: entry.lastName,
      totalHours: entry.overtime.totalWeeklyHours,
      overtimeHours: entry.overtime.overtimeHours,
      projectedCost: entry.overtime.projectedCost,
      warningCount: entry.overtime.warnings.length + entry.overtime.blocks.length,
    }));
    return {
      week,
      locationId,
      staff,
      atRiskCount: result.staffAtRisk,
      overtimeCount: staff.filter(s => s.overtimeHours > 0).length,
      totalProjectedCost: result.totalProjectedCost,
    };
  }

  @Query(() => [OnDutyEntryType])
  async onDutyNow(
    @Args('locationId', { type: () => ID, nullable: true }) locationId?: string,
  ): Promise<OnDutyEntryType[]> {
    const result = await this.getOnDutyNow.execute({ locationId });
    return result.map(entry => ({
      userId: entry.userId,
      firstName: entry.firstName,
      lastName: entry.lastName,
      shiftId: entry.shiftId,
      shiftStart: entry.startTime,
      shiftEnd: entry.endTime,
      locationId: entry.locationId,
      requiredSkill: entry.requiredSkill,
    }));
  }
}
