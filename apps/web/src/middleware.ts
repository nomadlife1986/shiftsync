import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

const PUBLIC_PATHS = ['/login'];

// Routes restricted to ADMIN only
const ADMIN_ONLY = ['/audit'];

// Routes restricted to ADMIN or MANAGER
const MANAGER_PLUS = ['/staff', '/overtime', '/analytics', '/on-duty'];

function getRoleForPath(pathname: string): Role[] {
  if (ADMIN_ONLY.some(p => pathname.startsWith(p))) return ['ADMIN'];
  if (MANAGER_PLUS.some(p => pathname.startsWith(p))) return ['ADMIN', 'MANAGER'];
  // All other protected routes are accessible by any authenticated user
  return ['ADMIN', 'MANAGER', 'STAFF'];
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('shiftsync_token')?.value;
  const role = request.cookies.get('shiftsync_role')?.value as Role | undefined;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  // Unauthenticated → /login
  if (!token && !isPublic) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated visiting /login → /schedule
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/schedule', request.url));
  }

  // Role check for protected routes
  if (token && role && !isPublic) {
    const allowedRoles = getRoleForPath(pathname);
    if (!allowedRoles.includes(role)) {
      // Redirect unauthorized access to /schedule (their home)
      return NextResponse.redirect(new URL('/schedule', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
