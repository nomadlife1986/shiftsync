import { ValueObject } from '../../common/value-object.base';
import { Result } from '../../common/result';

export type UserRoleType = 'ADMIN' | 'MANAGER' | 'STAFF';

interface UserRoleProps {
  value: UserRoleType;
}

export class UserRole extends ValueObject<UserRoleProps> {
  static readonly ADMIN = 'ADMIN' as const;
  static readonly MANAGER = 'MANAGER' as const;
  static readonly STAFF = 'STAFF' as const;

  private static readonly VALID_ROLES: UserRoleType[] = ['ADMIN', 'MANAGER', 'STAFF'];

  private constructor(props: UserRoleProps) {
    super(props);
  }

  get value(): UserRoleType {
    return this.props.value;
  }

  get isAdmin(): boolean {
    return this.props.value === UserRole.ADMIN;
  }

  get isManager(): boolean {
    return this.props.value === UserRole.MANAGER;
  }

  get isStaff(): boolean {
    return this.props.value === UserRole.STAFF;
  }

  canManageStaff(): boolean {
    return this.isAdmin || this.isManager;
  }

  canManageSchedule(): boolean {
    return this.isAdmin || this.isManager;
  }

  canViewAllLocations(): boolean {
    return this.isAdmin;
  }

  static create(role: string): Result<UserRole, string> {
    const normalized = role?.toUpperCase() as UserRoleType;

    if (!UserRole.VALID_ROLES.includes(normalized)) {
      return Result.fail<UserRole, string>(
        `Invalid role: ${role}. Must be one of: ${UserRole.VALID_ROLES.join(', ')}`,
      );
    }

    return Result.ok<UserRole, string>(new UserRole({ value: normalized }));
  }
}
