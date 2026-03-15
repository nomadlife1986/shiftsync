import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

// ── Overtime Dashboard ────────────────────────────────────────────────────────

@ObjectType()
export class OvertimeStaffEntryType {
  @Field(() => ID) userId!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
  @Field(() => Float) totalHours!: number;
  @Field(() => Float) overtimeHours!: number;
  @Field(() => Float) projectedCost!: number;
  @Field(() => Int) warningCount!: number;
}

@ObjectType()
export class OvertimeDashboardType {
  @Field() week!: Date;
  @Field({ nullable: true }) locationId?: string;
  @Field(() => [OvertimeStaffEntryType]) staff!: OvertimeStaffEntryType[];
  @Field(() => Int) atRiskCount!: number;
  @Field(() => Int) overtimeCount!: number;
  @Field(() => Float) totalProjectedCost!: number;
}

// ── Fairness Report ───────────────────────────────────────────────────────────

@ObjectType()
export class FairnessStaffType {
  @Field(() => ID) userId!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
  @Field(() => Float) totalHours!: number;
  @Field(() => Float, { nullable: true }) desiredHours?: number;
  @Field(() => Int) premiumShifts!: number;
  @Field(() => Float) delta!: number;
}

@ObjectType()
export class FairnessReportType {
  @Field(() => [FairnessStaffType]) staff!: FairnessStaffType[];
  @Field(() => Float) averageHours!: number;
  @Field(() => Float) fairnessScore!: number;
  @Field(() => Float) standardDeviation!: number;
}

// ── On-Duty Now ───────────────────────────────────────────────────────────────

@ObjectType()
export class OnDutyEntryType {
  @Field(() => ID) userId!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
  @Field() shiftId!: string;
  @Field() shiftStart!: Date;
  @Field() shiftEnd!: Date;
  @Field() locationId!: string;
  @Field() requiredSkill!: string;
}
