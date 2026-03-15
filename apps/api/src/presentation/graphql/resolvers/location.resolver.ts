import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/gql-auth.guard';
import { ObjectType, Field } from '@nestjs/graphql';
import { ILocationRepository, LOCATION_REPOSITORY } from '../../../domain/location/repositories/location.repository.interface';

@ObjectType()
class LocationType {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() address!: string;
  @Field() timezone!: string;
  @Field() createdAt!: Date;
}

@Resolver(() => LocationType)
@UseGuards(JwtAuthGuard)
export class LocationResolver {
  constructor(@Inject(LOCATION_REPOSITORY) private locationRepo: ILocationRepository) {}

  @Query(() => [LocationType])
  async locations(): Promise<LocationType[]> {
    const locs = await this.locationRepo.findAll();
    return locs.map(l => ({ id: l.id, name: l.name, address: l.address, timezone: l.timezone, createdAt: l.createdAt }));
  }

  @Query(() => LocationType)
  async location(@Args('id', { type: () => ID }) id: string): Promise<LocationType> {
    const l = await this.locationRepo.findById(id);
    if (!l) throw new Error('Location not found');
    return { id: l.id, name: l.name, address: l.address, timezone: l.timezone, createdAt: l.createdAt };
  }
}
