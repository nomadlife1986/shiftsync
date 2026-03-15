'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { AppSidebar } from '../../components/layout/sidebar';
import { SidebarProvider } from '../../components/ui/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto min-w-0 bg-[#fafafa]">
        {children}
      </main>
    </SidebarProvider>
  );
}
