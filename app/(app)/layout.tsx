import { AuthGuard } from '@/components/auth-guard';
import { AppShell } from '@/components/app-shell';

/**
 * Every internal screen lives under this route group: signed in, past the
 * forced password change, and wrapped in the workspace frame.
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
