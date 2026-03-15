import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ShiftType {
  @Field(() => ID) id!: string;
  @Field() locationId!: string;
  @Field() startTime!: Date;
  @Field() endTime!: Date;
  @Field() requiredSkill!: string;
  @Field(() => Int) headcount!: number;
  @Field() status!: string;
  @Field({ nullable: true }) scheduleWeek?: Date;
  @Field({ nullable: true }) publishedAt?: Date;
  @Field(() => Int) editCutoffHours!: number;
  @Field(() => [AssignmentType]) assignments!: AssignmentType[];
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class AssignmentType {
  @Field(() => ID) id!: string;
  @Field() shiftId!: string;
  @Field() userId!: string;
  @Field() status!: string;
  @Field() assignedBy!: string;
  @Field() createdAt!: Date;
}

@ObjectType()
export class WeekScheduleType {
  @Field() locationId!: string;
  @Field() week!: Date;
  @Field(() => [ShiftType]) shifts!: ShiftType[];
}

@ObjectType()
export class DomainEventType {
  @Field(() => ID) id!: string;
  @Field() aggregateId!: string;
  @Field() aggregateType!: string;
  @Field() eventType!: string;
  @Field() version!: number;
  @Field() occurredAt!: Date;
}
