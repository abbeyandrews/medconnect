'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { KeyRound, Lock, LockOpen, Pencil, Plus, Search, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DataState, EmptyState, PageHeader, Spinner } from '@/components/shared';
import { CredentialsDialog } from '@/components/credentials-dialog';
import { api, qs } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/use-api';
import { useAuth, ROLE_LABELS } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import type { Credentials, Department, Role, StaffAccount } from '@/lib/types';

/**
 * Staff account provisioning — the screen that stands in for self-registration.
 *
 * Everything about a login starts and ends here: creating it, putting it back
 * to the default password, unlocking it after failed attempts, and switching
 * it off when someone leaves.
 */
export default function StaffAccountsPage() {
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [credentials, setCredentials] = useState<{ credentials: Credentials; name: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const debouncedQuery = useDebounced(query);

  const { data, error, loading, reload } = useApi<{
    users: StaffAccount[];
    counts: { role: Role; count: number; active: number }[];
  }>(`/admin/users${qs({ query: debouncedQuery, role, status })}`);

  const { data: departmentData } = useApi<{ departments: Department[] }>('/departments');

  async function toggleActive(account: StaffAccount) {
    setBusyId(account.id);
    try {
      const { message } = await api.put<{ message: string }>(`/admin/users/${account.id}/status`, {
        isActive: !account.is_active,
      });
      toast.success(message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(account: StaffAccount) {
    setBusyId(account.id);
    try {
      const result = await api.post<{ credentials: Credentials; message: string }>(
        `/admin/users/${account.id}/reset-password`
      );
      setCredentials({ credentials: result.credentials, name: account.full_name });
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function unlock(account: StaffAccount) {
    setBusyId(account.id);
    try {
      await api.post(`/admin/users/${account.id}/unlock`);
      toast.success(`${account.full_name} can sign in again.`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Staff accounts"
        description="Every login in the system. There is no self-registration — accounts exist because you created them here."
      >
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Create account
        </Button>
      </PageHeader>

      {data && (
        <div className="mb-5 flex flex-wrap gap-2">
          {data.counts.map((count) => (
            <Badge key={count.role} variant="secondary" className="px-3 py-1">
              {ROLE_LABELS[count.role]}: <span className="ml-1 font-semibold">{count.active}</span>
              <span className="ml-1 text-muted-foreground">/ {count.count} active</span>
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, username or staff code…"
              className="pl-9"
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Administrators</SelectItem>
              <SelectItem value="receptionist">Receptionists</SelectItem>
              <SelectItem value="doctor">Doctors</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>

        <CardContent className="p-0">
          <DataState
            loading={loading}
            error={error}
            data={data}
            onRetry={reload}
            skeleton={<TableSkeleton rows={6} columns={5} />}
            isEmpty={(result) => result.users.length === 0}
            empty={<EmptyState title="No accounts match" />}
          >
            {(result) => (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.users.map((account) => {
                      const locked = account.locked_until && new Date(account.locked_until) > new Date();
                      const isSelf = account.id === user?.id;

                      return (
                        <TableRow key={account.id} className={cn('row-hover', !account.is_active && 'opacity-55')}>
                          <TableCell className="font-mono text-xs">{account.staff_code}</TableCell>
                          <TableCell>
                            <p className="font-medium text-ink">
                              {account.full_name}
                              {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                            </p>
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs md:table-cell">{account.username}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary">{ROLE_LABELS[account.role]}</Badge>
                              {Boolean(account.must_change_password) && (
                                <Badge variant="outline" className="border-signal/40 bg-signal/10 text-amber-800">
                                  Password not set
                                </Badge>
                              )}
                              {locked && (
                                <Badge variant="outline" className="border-destructive/25 bg-destructive/10 text-destructive">
                                  Locked
                                </Badge>
                              )}
                              {!account.is_active && (
                                <Badge variant="outline" className="border-destructive/25 text-destructive">
                                  Off
                                </Badge>
                              )}
                            </div>
                            {account.department_name && (
                              <p className="mt-1 text-xs text-muted-foreground">{account.department_name}</p>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                            {account.last_login_at ? formatRelative(account.last_login_at) : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {locked && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Unlock"
                                  disabled={busyId === account.id}
                                  onClick={() => unlock(account)}
                                >
                                  <LockOpen className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Reset to the default password"
                                disabled={busyId === account.id}
                                onClick={() => resetPassword(account)}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={() => {
                                  setEditing(account);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={account.is_active ? 'Deactivate' : 'Reactivate'}
                                disabled={busyId === account.id || isSelf}
                                onClick={() => toggleActive(account)}
                                className={cn(account.is_active && 'text-destructive hover:text-destructive')}
                              >
                                {account.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </DataState>
        </CardContent>
      </Card>

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        departments={departmentData?.departments ?? []}
        onSaved={reload}
        onCredentials={(creds, name) => setCredentials({ credentials: creds, name })}
      />

      <CredentialsDialog
        credentials={credentials?.credentials ?? null}
        personName={credentials?.name}
        onClose={() => setCredentials(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function AccountFormDialog({
  open,
  onOpenChange,
  account,
  departments,
  onSaved,
  onCredentials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: StaffAccount | null;
  departments: Department[];
  onSaved: () => void;
  onCredentials: (credentials: Credentials, name: string) => void;
}) {
  const isEdit = Boolean(account);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('receptionist');
  const [departmentId, setDepartmentId] = useState('');
  const [linkDoctorId, setLinkDoctorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: unlinked } = useApi<{ doctors: { id: number; full_name: string; department_name: string }[] }>(
    open && !isEdit && role === 'doctor' ? '/admin/users/unlinked-doctors' : null
  );

  const [lastKey, setLastKey] = useState('');
  const key = `${open}-${account?.id ?? 'new'}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setFullName(account?.full_name ?? '');
      setUsername(account?.username ?? '');
      setPhone(account?.phone ?? '');
      setRole(account?.role ?? 'receptionist');
      setDepartmentId('');
      setLinkDoctorId('');
      setError(null);
    }
  }

  // With no email collected, the username is what identifies the account, so
  // it has to be typed rather than derived.
  const usernameValid = /^[a-z0-9._-]{3,60}$/.test(username.trim().toLowerCase());
  const needsDepartment = !isEdit && role === 'doctor' && !linkDoctorId;
  const canSubmit =
    fullName.trim().length >= 3 && usernameValid && (!needsDepartment || Boolean(departmentId)) && !saving;

  async function submit() {
    setError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      role,
    };
    if (!isEdit && role === 'doctor') {
      if (linkDoctorId) payload.doctorId = Number(linkDoctorId);
      else payload.departmentId = Number(departmentId);
    }

    try {
      if (isEdit) {
        const { message } = await api.put<{ message: string }>(`/admin/users/${account!.id}`, payload);
        toast.success(message);
      } else {
        const result = await api.post<{ credentials: Credentials; message: string }>('/admin/users', payload);
        toast.success(result.message);
        onCredentials(result.credentials, fullName.trim());
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'The account could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${account!.full_name}` : 'Create a staff account'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this person’s details. To put their password back to the default, use the key icon on the list.'
              : 'The account starts on the standard password, which is shown once you save. They can change it themselves from My profile.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="space-y-1.5">
            <Label htmlFor="staffName">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input id="staffName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staffUsername">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staffUsername"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. a.boakye"
              />
              <p className="text-xs text-muted-foreground">
                This is what they sign in with: letters, numbers, dot, dash or underscore.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staffPhone">Phone</Label>
              <Input id="staffPhone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receptionist">Receptionist — front desk, patients and bookings</SelectItem>
                <SelectItem value="doctor">Doctor — own schedule and consultation notes</SelectItem>
                <SelectItem value="admin">Administrator — everything, including this screen</SelectItem>
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                A role cannot be changed. Deactivate this account and create the correct one instead.
              </p>
            )}
          </div>

          {!isEdit && role === 'doctor' && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-ink">Doctor profile</p>

              {(unlinked?.doctors?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <Label>Link to an existing doctor</Label>
                  <Select value={linkDoctorId} onValueChange={setLinkDoctorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Create a new profile instead" />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinked!.doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={String(doctor.id)}>
                          Dr. {doctor.full_name.replace(/^Dr\.?\s*/i, '')} — {doctor.department_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    These doctors are already on the schedule but have no login yet.
                  </p>
                </div>
              )}

              {!linkDoctorId && (
                <div className="space-y-1.5">
                  <Label>
                    Department <span className="text-destructive">*</span>
                  </Label>
                  {departments.length === 0 ? (
                    // Same dead end as the Doctors form: no department means no
                    // doctor profile can be created, so explain rather than
                    // offering an empty list.
                    <div className="rounded-md border border-signal/40 bg-signal/10 p-3">
                      <p className="text-xs text-ink">
                        No departments exist yet, and a doctor account needs one.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" asChild>
                        <Link href="/admin/departments">Set up departments first</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={String(department.id)}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        A doctor profile is created alongside the login. Set their clinic hours from the Doctors screen.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {!isEdit && role === 'admin' && (
            <Alert variant="warning" title="Full access">
              An administrator can create and delete accounts, change system settings and read the audit log. Only give
              this role to people who need it.
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              <>
                <Lock className="h-4 w-4" /> Create account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
