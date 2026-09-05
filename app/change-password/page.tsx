'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { CenteredSpinner, Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { useAuth, homeFor } from '@/lib/auth';
import { errorMessage } from '@/lib/utils';

/**
 * Password change.
 *
 * There are deliberately no composition rules — no minimum length, no required
 * letter or digit. Whatever the person types is what they get; the only checks
 * left are that the field is not empty and that the confirmation matches, so a
 * mistyped password cannot be saved by accident.
 */

/** One password field with a single, always-present show/hide control. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="pr-10"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return <CenteredSpinner label="Loading…" />;

  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && matches;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      await refresh();
      toast.success('Password updated.');
      router.replace(homeFor(user));
    } catch (err) {
      setError(errorMessage(err, 'Could not change your password.'));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md panel-surface text-white">
            <Activity className="h-4 w-4" />
          </span>
          <span className="font-display text-xl text-ink">MedConnect</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-panel">
          <h1 className="font-display text-xl text-ink">Change your password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pick anything you will remember. There are no character requirements.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <Alert variant="danger" role="alert">
                {error}
              </Alert>
            )}

            <PasswordField
              id="currentPassword"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              autoFocus
            />

            <PasswordField
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />

            <div className="space-y-1.5">
              <PasswordField
                id="confirmPassword"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !matches && (
                <p className="text-xs text-destructive">Those two passwords do not match.</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
              {submitting ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                'Save password'
              )}
            </Button>

            <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()}>
              Cancel
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
