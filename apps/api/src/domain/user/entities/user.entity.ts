import { AggregateRoot } from '../../common/aggregate-root.base';
import { AvailabilityChangedEvent } from '../events/availability-changed.event';

export interface UserCertification {
  locationId: string;
  certifiedAt: Date;
  revokedAt: Date | null;
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate: Date | null;
  isAvailable: boolean;
}

export interface UserProps {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  phone: string | null;
  desiredWeeklyHours: number | null;
  skills: string[];
  certifications: UserCertification[];
  availabilities: AvailabilityWindow[];
  managedLocationIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity extends AggregateRoot<UserProps> {
  get email(): string { return this.props.email; }
  get passwordHash(): string { return this.props.passwordHash; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get role(): string { return this.props.role; }
  get phone(): string | null { return this.props.phone; }
  get desiredWeeklyHours(): number | null { return this.props.desiredWeeklyHours; }
  get skills(): string[] { return [...this.props.skills]; }
  get certifications(): UserCertification[] { return [...this.props.certifications]; }
  get availabilities(): AvailabilityWindow[] { return [...this.props.availabilities]; }
  get managedLocationIds(): string[] { return [...this.props.managedLocationIds]; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(props: UserProps, id: string): UserEntity {
    return new UserEntity(props, id);
  }

  static reconstitute(props: UserProps, id: string): UserEntity {
    return new UserEntity(props, id);
  }

  hasSkill(skill: string): boolean {
    return this.props.skills.includes(skill);
  }

  isCertifiedAt(locationId: string): boolean {
    return this.props.certifications.some(
      (c) => c.locationId === locationId && c.revokedAt === null,
    );
  }

  hasActiveCertification(locationId: string): boolean {
    return this.isCertifiedAt(locationId);
  }

  isAdmin(): boolean { return this.props.role === 'ADMIN'; }
  isManager(): boolean { return this.props.role === 'MANAGER'; }
  isStaff(): boolean { return this.props.role === 'STAFF'; }

  canManageLocation(locationId: string): boolean {
    if (this.isAdmin()) return true;
    return this.props.managedLocationIds.includes(locationId);
  }

  addSkill(skill: string): void {
    if (!this.props.skills.includes(skill)) {
      this.props.skills.push(skill);
    }
  }

  removeSkill(skill: string): void {
    this.props.skills = this.props.skills.filter((s) => s !== skill);
  }

  certifyForLocation(locationId: string): void {
    const existing = this.props.certifications.find((c) => c.locationId === locationId);
    if (existing) {
      existing.revokedAt = null;
      existing.certifiedAt = new Date();
    } else {
      this.props.certifications.push({
        locationId,
        certifiedAt: new Date(),
        revokedAt: null,
      });
    }
  }

  revokeLocationCert(locationId: string): void {
    const cert = this.props.certifications.find((c) => c.locationId === locationId);
    if (cert) {
      cert.revokedAt = new Date();
    }
  }

  setAvailability(windows: AvailabilityWindow[]): void {
    this.props.availabilities = windows;
    this.addDomainEvent(new AvailabilityChangedEvent(this.id));
  }

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    desiredWeeklyHours?: number | null;
  }): void {
    if (data.firstName !== undefined) this.props.firstName = data.firstName;
    if (data.lastName !== undefined) this.props.lastName = data.lastName;
    if (data.phone !== undefined) this.props.phone = data.phone;
    if (data.desiredWeeklyHours !== undefined) this.props.desiredWeeklyHours = data.desiredWeeklyHours;
    this.props.updatedAt = new Date();
  }
}
