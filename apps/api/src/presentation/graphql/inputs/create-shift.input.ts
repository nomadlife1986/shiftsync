import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateShiftInput {
  @Field() locationId!: string;
  @Field() startTime!: Date;
  @Field() endTime!: Date;
  @Field() requiredSkill!: string;
  @Field(() => Int) headcount!: number;
  @Field(() => Int, { defaultValue: 48 }) editCutoffHours!: number;
}

@InputType()
export class UpdateShiftInput {
  @Field({ nullable: true }) startTime?: Date;
  @Field({ nullable: true }) endTime?: Date;
  @Field({ nullable: true }) requiredSkill?: string;
  @Field(() => Int, { nullable: true }) headcount?: number;
  @Field(() => Int, { nullable: true }) editCutoffHours?: number;
}

@InputType()
export class RequestSwapInput {
  @Field() shiftId!: string;
  @Field({ nullable: true }) targetId?: string;
}

@InputType()
export class RequestDropInput {
  @Field() shiftId!: string;
}

@InputType()
export class CreateUserInput {
  @Field() email!: string;
  @Field() password!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
  @Field() role!: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) desiredWeeklyHours?: number;
  @Field(() => [String], { nullable: true }) skills?: string[];
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true }) firstName?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) desiredWeeklyHours?: number;
  @Field(() => [String], { nullable: true }) skills?: string[];
}

@InputType()
export class AvailabilityInputType {
  @Field() dayOfWeek!: number;
  @Field() startTime!: string;
  @Field() endTime!: string;
  @Field() isRecurring!: boolean;
  @Field({ nullable: true }) specificDate?: Date;
  @Field() isAvailable!: boolean;
}

@InputType()
export class SetAvailabilityInput {
  @Field(() => [AvailabilityInputType]) availability!: AvailabilityInputType[];
}

@InputType()
export class NotificationPrefInput {
  @Field({ nullable: true }) inApp?: boolean;
  @Field({ nullable: true }) email?: boolean;
}

@InputType()
export class EventFilterInput {
  @Field({ nullable: true }) aggregateType?: string;
  @Field({ nullable: true }) aggregateId?: string;
  @Field({ nullable: true }) eventType?: string;
  @Field({ nullable: true }) startDate?: Date;
  @Field({ nullable: true }) endDate?: Date;
}
