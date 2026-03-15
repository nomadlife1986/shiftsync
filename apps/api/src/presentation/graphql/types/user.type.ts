import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class AvailabilityType {
  @Field() dayOfWeek!: number;
  @Field() startTime!: string;
  @Field() endTime!: string;
  @Field() isRecurring!: boolean;
  @Field({ nullable: true }) specificDate?: Date;
  @Field() isAvailable!: boolean;
}

@ObjectType()
export class UserType {
  @Field(() => ID) id!: string;
  @Field() email!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
  @Field() role!: string;
  @Field({ nullable: true }) phone?: string;
  @Field(() => Float, { nullable: true }) desiredWeeklyHours?: number;
  @Field(() => [String]) skills!: string[];
  @Field(() => [AvailabilityType]) availability!: AvailabilityType[];
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
