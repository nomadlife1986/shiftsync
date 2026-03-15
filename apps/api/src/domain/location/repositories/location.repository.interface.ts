import { LocationEntity } from '../entities/location.entity';

export interface ILocationRepository {
  findById(id: string): Promise<LocationEntity | null>;
  findAll(): Promise<LocationEntity[]>;
  findByIds(ids: string[]): Promise<LocationEntity[]>;
  save(location: LocationEntity): Promise<LocationEntity>;
}

export const LOCATION_REPOSITORY = 'ILocationRepository';
