'use client';

import { useState, useCallback } from 'react';
import { AuthProvider } from '@/components/providers/auth-provider';
import { DashboardSidebar } from '@/components/layouts/dashboard-sidebar';
import { Topbar } from '@/components/layouts/topbar';
import { DashboardKeyboardShortcuts } from '@/components/layouts/dashboard-keyboard-shortcuts';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <AuthProvider>
      <div className="flex h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={closeSidebar}
          />
        )}

        <DashboardSidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenuToggle={toggleSidebar} />
          <main className="flex-1 overflow-y-auto bg-page">{children}</main>
        </div>
      </div>
      <DashboardKeyboardShortcuts />
    </AuthProvider>
  );
}
