import { Module } from '@nestjs/common';
import { LOCATION_REPOSITORY } from '../domain/location/repositories/location.repository.interface';
import { PrismaLocationRepository } from '../infrastructure/persistence/repositories/prisma-location.repository';
import { LocationResolver } from '../presentation/graphql/resolvers/location.resolver';

@Module({
  providers: [
    { provide: LOCATION_REPOSITORY, useClass: PrismaLocationRepository },
    LocationResolver,
  ],
  exports: [LOCATION_REPOSITORY],
})
export class LocationModule {}
