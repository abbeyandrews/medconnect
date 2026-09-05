'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { CenteredSpinner, EmptyState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import type { Role } from '@/lib/types';

/**
 * Gates a screen on being signed in, having replaced the issued temporary
 * password, and holding one of `roles`.
 *
 * This is a convenience, not the security boundary — every endpoint behind it
 * checks the same things server-side.
 */
export function AuthGuard({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.mustChangePassword) router.replace('/change-password');
  }, [loading, user, router]);

  if (loading || !user || user.mustChangePassword) {
    return <CenteredSpinner label="Checking your session…" />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You do not have access to this area"
        description="This section is limited to other roles. If you think that is wrong, ask an administrator to check your account."
        action={
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
