import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class NotificationType {
  @Field(() => ID) id!: string;
  @Field() userId!: string;
  @Field() type!: string;
  @Field() title!: string;
  @Field() message!: string;
  @Field() isRead!: boolean;
  @Field() createdAt!: Date;
}
