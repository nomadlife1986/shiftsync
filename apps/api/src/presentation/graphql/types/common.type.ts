import { ObjectType, Field, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class ConstraintViolationType {
  @Field() type!: string;
  @Field() message!: string;
}

@ObjectType()
export class OvertimeWarningType {
  @Field() type!: string;
  @Field() message!: string;
}

@ObjectType()
export class StaffSuggestionType {
  @Field(() => ID) userId!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
  @Field(() => Float) matchScore!: number;
  @Field(() => [String]) warnings!: string[];
}

@ObjectType()
export class AssignmentResultType {
  @Field() success!: boolean;
  @Field({ nullable: true }) assignmentId?: string;
  @Field(() => [ConstraintViolationType], { defaultValue: [] }) violations!: ConstraintViolationType[];
  @Field(() => [OvertimeWarningType], { defaultValue: [] }) overtimeWarnings!: OvertimeWarningType[];
  @Field(() => [StaffSuggestionType], { defaultValue: [] }) suggestions!: StaffSuggestionType[];
}

@ObjectType()
export class WhatIfResultType {
  @Field() canAssign!: boolean;
  @Field(() => [ConstraintViolationType], { defaultValue: [] }) violations!: ConstraintViolationType[];
  @Field(() => [OvertimeWarningType], { defaultValue: [] }) warnings!: OvertimeWarningType[];
  @Field(() => Float) projectedWeeklyHours!: number;
}
