'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';

type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

/**
 * Redirects to /schedule if the current user's role is not in allowedRoles.
 * Use at the top of any page that should be role-restricted.
 */
export function useRoleGuard(allowedRoles: Role[]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      router.replace('/schedule');
    }
  }, [user, isLoading, allowedRoles, router]);

  const isAuthorized = !user || allowedRoles.includes(user.role);
  return { isAuthorized, isLoading };
}
