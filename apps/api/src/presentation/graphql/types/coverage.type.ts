import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class SwapRequestType {
  @Field(() => ID) id!: string;
  @Field() shiftId!: string;
  @Field() requesterId!: string;
  @Field({ nullable: true }) targetId?: string;
  @Field() status!: string;
  @Field({ nullable: true }) targetAccepted?: boolean;
  @Field({ nullable: true }) managerApproved?: boolean;
  @Field({ nullable: true }) managerId?: string;
  @Field({ nullable: true }) cancelReason?: string;
  @Field({ nullable: true }) expiresAt?: Date;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class DropRequestType {
  @Field(() => ID) id!: string;
  @Field() shiftId!: string;
  @Field() requesterId!: string;
  @Field() status!: string;
  @Field({ nullable: true }) pickedUpById?: string;
  @Field({ nullable: true }) managerId?: string;
  @Field() expiresAt!: Date;
  @Field({ nullable: true }) managerNote?: string;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
