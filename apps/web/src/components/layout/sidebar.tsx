'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { useNotificationStore } from '../../stores/notification-store';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Users,
  ArrowLeftRight,
  AlertTriangle,
  BarChart2,
  Radio,
  Bell,
  ClipboardList,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: '/schedule',      label: 'Schedule',      icon: Calendar,       roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { href: '/staff',         label: 'Staff',         icon: Users,          roles: ['ADMIN', 'MANAGER'] },
  { href: '/coverage',      label: 'Coverage',      icon: ArrowLeftRight, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { href: '/overtime',      label: 'Overtime',      icon: AlertTriangle,  roles: ['ADMIN', 'MANAGER'] },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart2,      roles: ['ADMIN', 'MANAGER'] },
  { href: '/on-duty',       label: 'On Duty',       icon: Radio,          roles: ['ADMIN', 'MANAGER'] },
  { href: '/notifications', label: 'Notifications', icon: Bell,           roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { href: '/audit',         label: 'Audit Log',     icon: ClipboardList,  roles: ['ADMIN'] },
  { href: '/settings',      label: 'Settings',      icon: Settings,       roles: ['ADMIN', 'MANAGER', 'STAFF'] },
];

const ROLE_PILL: Record<string, string> = {
  ADMIN:   'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/25',
  MANAGER: 'bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-400/25',
  STAFF:   'bg-zinc-700/60 text-zinc-300 ring-1 ring-inset ring-zinc-600/50',
};

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const unreadCount = useNotificationStore(s => s.unreadCount);

  const visibleItems = navItems.filter(
    item => user?.role && item.roles.includes(user.role),
  );

  return (
    <Sidebar className="bg-[#0f0f0f] w-[260px]">

      {/* ── Logo ── */}
      <SidebarHeader className="h-[56px] px-4 justify-center">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[7px] bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Zap size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <p className="text-[13px] font-semibold text-white tracking-[-0.01em]">ShiftSync</p>
            <p className="text-[11px] text-zinc-600 mt-[3px]">Coastal Eats</p>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="pt-1">
        <SidebarGroup>
          <SidebarMenu>
            {visibleItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.href}>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[16px] rounded-full bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.45)] z-10" />
                  )}
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.href}>
                      <Icon
                        size={14}
                        strokeWidth={isActive ? 2.25 : 1.75}
                        className={isActive ? 'text-white' : 'text-zinc-500 group-hover/btn:text-zinc-300 transition-colors'}
                      />
                      <span className={isActive ? 'text-white' : 'text-zinc-400 group-hover/btn:text-white transition-colors'}>
                        {item.label}
                      </span>
                      {item.href === '/notifications' && unreadCount > 0 && (
                        <SidebarMenuBadge>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </SidebarMenuBadge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User Footer ── */}
      <SidebarFooter className="px-2 py-3">
        <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-zinc-100 truncate leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <span className={`inline-block text-[9.5px] font-semibold uppercase tracking-wider px-[6px] py-[2px] rounded-full mt-[5px] ${ROLE_PILL[user?.role ?? ''] ?? ROLE_PILL.STAFF}`}>
              {user?.role?.toLowerCase()}
            </span>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut size={14} strokeWidth={1.75} className="text-zinc-500 group-hover/btn:text-zinc-300 transition-colors" />
              <span className="text-zinc-400 group-hover/btn:text-white transition-colors">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
}
