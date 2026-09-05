'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { KeyRound, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Field, PageHeader, Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { useAuth, ROLE_LABELS } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { errorMessage } from '@/lib/utils';
import type { User } from '@/lib/types';

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const dirty = fullName !== user.fullName || (phone || '') !== (user.phone || '');

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const result = await api.put<{ user: User; message: string }>('/auth/profile', {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      setUser(result.user);
      toast.success(result.message);
    } catch (err) {
      setError(errorMessage(err, 'Your profile could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="My profile" description="Your own account details." />

      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Your name is shown on the audit trail of everything you do.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>

            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Set by an administrator and not editable here.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <Field label="Staff code">
                  <span className="font-mono text-xs">{user.staffCode}</span>
                </Field>
                <Field label="Username">
                  <span className="font-mono text-xs">{user.username}</span>
                </Field>
                <Field label="Role">{ROLE_LABELS[user.role]}</Field>
                <Field label="Last signed in">{formatDateTime(user.lastLoginAt)}</Field>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Change your password regularly, and never share it. Everything you do here is recorded against your
                name in the audit log.
              </p>
              <Button variant="outline" asChild>
                <Link href="/change-password">
                  <KeyRound className="h-4 w-4" /> Change password
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
