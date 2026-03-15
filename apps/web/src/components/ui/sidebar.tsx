'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

// ─── Context ──────────────────────────────────────────────────────────────────

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SidebarProvider({
  children,
  defaultOpen = true,
  className,
  style,
  ...props
}: React.ComponentProps<'div'> & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div
        style={
          {
            '--sidebar-width': '16rem',
            '--sidebar-width-icon': '3.5rem',
            ...style,
          } as React.CSSProperties
        }
        className={cn('flex h-screen w-full overflow-hidden', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// ─── Sidebar shell ────────────────────────────────────────────────────────────

export const Sidebar = React.forwardRef<
  HTMLElement,
  React.ComponentProps<'aside'>
>(({ className, children, ...props }, ref) => (
  <aside
    ref={ref}
    data-sidebar="sidebar"
    className={cn(
      'group/sidebar flex h-full w-[--sidebar-width] shrink-0 flex-col overflow-hidden',
      className,
    )}
    {...props}
  >
    {children}
  </aside>
));
Sidebar.displayName = 'Sidebar';

// ─── Sections ─────────────────────────────────────────────────────────────────

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex shrink-0 flex-col', className)} {...props} />
));
SidebarHeader.displayName = 'SidebarHeader';

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
));
SidebarContent.displayName = 'SidebarContent';

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex shrink-0 flex-col', className)} {...props} />
));
SidebarFooter.displayName = 'SidebarFooter';

// ─── Group ────────────────────────────────────────────────────────────────────

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative flex w-full min-w-0 flex-col px-2 py-1', className)}
    {...props}
  />
));
SidebarGroup.displayName = 'SidebarGroup';

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-7 shrink-0 items-center px-2 text-[11px] font-medium tracking-widest uppercase',
      'text-sidebar-foreground/40 select-none',
      className,
    )}
    {...props}
  />
));
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('w-full', className)} {...props} />
));
SidebarGroupContent.displayName = 'SidebarGroupContent';

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('flex w-full min-w-0 flex-col gap-px', className)}
    {...props}
  />
));
SidebarMenu.displayName = 'SidebarMenu';

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('group/menu-item relative', className)} {...props} />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

// ─── Menu Button ──────────────────────────────────────────────────────────────

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
  }
>(({ asChild = false, isActive = false, className, children, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref as React.Ref<HTMLButtonElement>}
      data-active={isActive}
      className={cn(
        // base
        'group/btn relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px]',
        'text-[13px] font-medium tracking-[-0.005em] outline-none',
        'transition-colors duration-100 cursor-pointer',
        // inactive
        'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
        // active
        'data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-accent',
        // truncation for text
        '[&>span]:truncate [&>span]:flex-1',
        // icon sizing
        '[&>svg]:size-[14px] [&>svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = 'SidebarMenuButton';

// ─── Menu Badge ───────────────────────────────────────────────────────────────

export const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full',
      'bg-blue-600 px-1 text-[10px] font-bold text-white tabular-nums',
      className,
    )}
    {...props}
  />
));
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

// ─── User Button (footer) ─────────────────────────────────────────────────────

export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { asChild?: boolean; showOnHover?: boolean }
>(({ asChild = false, showOnHover = false, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cn(
        'absolute right-1 top-1/2 -translate-y-1/2 flex aspect-square w-5 items-center justify-center rounded-md',
        'text-sidebar-foreground/50 outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground',
        'transition-colors duration-100',
        showOnHover && 'opacity-0 group-hover/menu-item:opacity-100',
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = 'SidebarMenuAction';
