import { AuthProvider } from '@/components/providers/auth-provider';
import { DashboardSidebar } from '@/components/layouts/dashboard-sidebar';
import { Topbar } from '@/components/layouts/topbar';
import { DashboardKeyboardShortcuts } from '@/components/layouts/dashboard-keyboard-shortcuts';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-page">{children}</main>
        </div>
      </div>
      <DashboardKeyboardShortcuts />
    </AuthProvider>
  );
}
