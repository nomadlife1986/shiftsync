import { Entity } from '../../common/entity.base';

export interface LocationProps {
  name: string;
  address: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LocationEntity extends Entity<LocationProps> {
  get name(): string { return this.props.name; }
  get address(): string { return this.props.address; }
  get timezone(): string { return this.props.timezone; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(props: LocationProps, id: string): LocationEntity {
    return new LocationEntity(props, id);
  }

  static reconstitute(props: LocationProps, id: string): LocationEntity {
    return new LocationEntity(props, id);
  }
}
