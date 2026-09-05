import { AuthGuard } from '@/components/auth-guard';

/**
 * /admin is administrator-only. The guard renders a clear refusal rather than
 * a blank page if someone reaches it another way; every /api/admin route
 * checks the role again server-side.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard roles={['admin']}>{children}</AuthGuard>;
}
