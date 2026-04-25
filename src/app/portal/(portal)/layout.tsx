import { AuthProvider } from '@/components/providers/auth-provider';
import { PortalSidebar } from '@/components/layouts/portal-sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen">
        <PortalSidebar />
        <main className="flex-1 overflow-y-auto bg-page">{children}</main>
      </div>
    </AuthProvider>
  );
}
