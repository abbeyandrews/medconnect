'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarRange, CalendarX2, Clock, KeyRound, Pencil, Plus, Search, Stethoscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DataState, EmptyState, PageHeader, Spinner } from '@/components/shared';
import { AvailabilityEditor } from '@/components/availability-editor';
import { CredentialsDialog } from '@/components/credentials-dialog';
import { UnavailableDialog } from '@/components/unavailable-dialog';
import { api, qs } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { doctorName, summariseAvailability, todayStr } from '@/lib/format';
import { cn, errorMessage, accentVars } from '@/lib/utils';
import type { Credentials, Department, Doctor } from '@/lib/types';

export default function DoctorsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [availabilityFor, setAvailabilityFor] = useState<Doctor | null>(null);
  const [unavailableFor, setUnavailableFor] = useState<Doctor | null>(null);
  const [credentials, setCredentials] = useState<{ credentials: Credentials; name: string } | null>(null);

  const debouncedQuery = useDebounced(query);

  const { data, error, loading, reload } = useApi<{ doctors: Doctor[] }>(
    `/doctors${qs({ query: debouncedQuery, departmentId })}`
  );
  const { data: departmentData } = useApi<{ departments: Department[] }>('/departments');

  return (
    <>
      <PageHeader
        title="Doctors"
        description="Who patients can be booked with, and the clinic hours that open their slots on both channels."
      >
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add doctor
          </Button>
        )}
      </PageHeader>

      {/* Doctors hang off departments, so say so before the form dead-ends. */}
      {isAdmin && departmentData && departmentData.departments.length === 0 && (
        <Alert variant="warning" className="mb-5" title="Add departments before doctors">
          Every doctor belongs to a department, and there are none yet. Open{' '}
          <Link href="/admin/departments" className="font-medium text-ink underline underline-offset-2">
            Departments
          </Link>{' '}
          and pick the clinics your hospital runs — the list there offers the usual ones.
        </Alert>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or specialty…"
            className="pl-9"
          />
        </div>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departmentData?.departments ?? []).map((department) => (
              <SelectItem key={department.id} value={String(department.id)}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        loading={loading}
        error={error}
        data={data}
        onRetry={reload}
        skeleton={<TableSkeleton rows={5} columns={4} />}
        isEmpty={(result) => result.doctors.length === 0}
        empty={
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Stethoscope}
                title="No doctors found"
                description={
                  query || departmentId !== 'all'
                    ? 'Try a different search or department.'
                    : 'Add a doctor to start taking appointments.'
                }
              />
            </CardContent>
          </Card>
        }
      >
        {(result) => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.doctors.map((doctor, index) => (
              <Card key={doctor.id} style={accentVars(index)} className={cn('tile', !doctor.is_active && 'opacity-60')}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{doctorName(doctor.full_name)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doctor.specialty || 'General practice'}
                      </p>
                    </div>
                    {!doctor.is_active && (
                      <Badge variant="outline" className="shrink-0 border-destructive/25 text-destructive">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{doctor.department_name}</Badge>
                    {doctor.room && <Badge variant="outline">Room {doctor.room}</Badge>}
                    {doctor.username ? (
                      <Badge variant="outline" className="border-primary/25 text-primary">
                        <KeyRound className="mr-1 h-3 w-3" /> Portal access
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No login
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{summariseAvailability(doctor.availability)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/schedule?doctor=${doctor.id}`}>
                        <CalendarRange className="h-3.5 w-3.5" /> Schedule
                      </Link>
                    </Button>
                    {(isAdmin || user?.doctorId === doctor.id) && (
                      <Button variant="outline" size="sm" onClick={() => setAvailabilityFor(doctor)}>
                        <Clock className="h-3.5 w-3.5" /> Hours
                      </Button>
                    )}
                    {/* Reception can do this too — in an emergency the doctor
                        is rarely the one at a keyboard. */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setUnavailableFor(doctor)}
                    >
                      <CalendarX2 className="h-3.5 w-3.5" /> Unavailable
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(doctor);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DataState>

      {isAdmin && (
        <DoctorFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          doctor={editing}
          departments={departmentData?.departments ?? []}
          onSaved={reload}
          onCredentials={(creds, name) => setCredentials({ credentials: creds, name })}
        />
      )}

      {unavailableFor && (
        <UnavailableDialog
          open={Boolean(unavailableFor)}
          onOpenChange={(open) => !open && setUnavailableFor(null)}
          doctor={unavailableFor}
          onChanged={reload}
        />
      )}

      {availabilityFor && (
        <AvailabilityEditor
          open={Boolean(availabilityFor)}
          onOpenChange={(open) => !open && setAvailabilityFor(null)}
          doctor={availabilityFor}
          initial={availabilityFor.availability ?? []}
          onSaved={reload}
        />
      )}

      <CredentialsDialog
        credentials={credentials?.credentials ?? null}
        personName={credentials?.name}
        onClose={() => setCredentials(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function DoctorFormDialog({
  open,
  onOpenChange,
  doctor,
  departments,
  onSaved,
  onCredentials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Doctor | null;
  departments: Department[];
  onSaved: () => void;
  onCredentials: (credentials: Credentials, name: string) => void;
}) {
  const isEdit = Boolean(doctor);

  const [fullName, setFullName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [room, setRoom] = useState('');
  const [bio, setBio] = useState('');
  const [clinicDate, setClinicDate] = useState('');
  const [clinicTime, setClinicTime] = useState('08:00');
  const [slotMinutes, setSlotMinutes] = useState('30');
  const [isActive, setIsActive] = useState(true);
  const [createAccount, setCreateAccount] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form each time the dialog opens for a different doctor.
  const [lastKey, setLastKey] = useState<string>('');
  const key = `${open}-${doctor?.id ?? 'new'}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setFullName(doctor?.full_name ?? '');
      setDepartmentId(doctor ? String(doctor.department_id) : '');
      setSpecialty(doctor?.specialty ?? '');
      setPhone(doctor?.phone ?? '');
      setRoom(doctor?.room ?? '');
      setBio(doctor?.bio ?? '');
      setClinicDate(doctor ? '' : todayStr());
      setClinicTime('08:00');
      setSlotMinutes(String(doctor?.slot_minutes ?? 30));
      setIsActive(doctor ? Boolean(doctor.is_active) : true);
      setCreateAccount(!doctor);
      setUsername('');
      setError(null);
    }
  }

  const minutes = Number(slotMinutes);
  const minutesValid = Number.isInteger(minutes) && minutes >= 5 && minutes <= 240;
  const canSubmit = fullName.trim().length >= 3 && Boolean(departmentId) && minutesValid && !saving;

  async function submit() {
    setError(null);
    setSaving(true);

    const payload = {
      fullName: fullName.trim(),
      departmentId: Number(departmentId),
      specialty: specialty.trim() || undefined,
      phone: phone.trim() || undefined,
      room: room.trim() || undefined,
      bio: bio.trim() || undefined,
      slotMinutes: minutes,
      // Only meaningful when adding: it seeds the doctor's first clinic window.
      ...(isEdit ? { isActive } : { clinicDate, clinicTime, createAccount, username: username.trim() || undefined }),
    };

    try {
      if (isEdit) {
        const { message } = await api.put<{ message: string }>(`/doctors/${doctor!.id}`, payload);
        toast.success(message);
      } else {
        const result = await api.post<{ message: string; credentials: Credentials | null }>('/doctors', payload);
        toast.success(result.message);
        if (result.credentials) onCredentials(result.credentials, fullName.trim());
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'The doctor could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${doctorName(doctor!.full_name)}` : 'Add a doctor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this doctor’s profile. Clinic hours are set separately.'
              : 'Adds the doctor to the schedule, and optionally issues them a portal login.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="doctorName">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doctorName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Ama Boakye"
              />
              <p className="text-xs text-muted-foreground">Do not type “Dr.” — it is added automatically.</p>
            </div>

            <div className="space-y-1.5">
              <Label>
                Department <span className="text-destructive">*</span>
              </Label>
              {departments.length === 0 ? (
                // A doctor must belong to a department, so an empty dropdown is a
                // dead end. Say why it is empty and link to the fix.
                <div className="rounded-md border border-signal/40 bg-signal/10 p-3">
                  <p className="text-xs text-ink">
                    No departments exist yet, and every doctor has to belong to one.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link href="/admin/departments">Set up departments first</Link>
                  </Button>
                </div>
              ) : (
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
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="e.g. Cardiologist"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doctorPhone">Phone</Label>
              <Input id="doctorPhone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room">Consulting room</Label>
              <Input id="room" value={room} onChange={(event) => setRoom(event.target.value)} placeholder="e.g. A-102" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bio">Notes</Label>
              <Textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} rows={2} />
            </div>
          </div>

          {/* Clinic timing: a date, a start time, and a length you type yourself. */}
          <div className="space-y-3 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium text-ink">{isEdit ? 'Consultation length' : 'First clinic'}</p>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'How long one appointment runs. Change the days and times under Hours.'
                  : 'When this doctor starts seeing patients, and how long each appointment runs.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {!isEdit && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="clinicDate">Date</Label>
                    <Input
                      id="clinicDate"
                      type="date"
                      value={clinicDate}
                      min={todayStr()}
                      onChange={(event) => setClinicDate(event.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="clinicTime">Time</Label>
                    <Input
                      id="clinicTime"
                      type="time"
                      value={clinicTime}
                      onChange={(event) => setClinicTime(event.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="slotMinutes">Minutes per appointment</Label>
                <Input
                  id="slotMinutes"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={240}
                  value={slotMinutes}
                  onChange={(event) => setSlotMinutes(event.target.value)}
                  placeholder="e.g. 45"
                />
              </div>
            </div>

            {slotMinutes !== '' && !minutesValid ? (
              <p className="text-xs text-destructive">Enter a whole number of minutes between 5 and 240.</p>
            ) : (
              !isEdit &&
              clinicDate !== '' && (
                <p className="text-xs text-muted-foreground">
                  Creates a weekly clinic on that weekday from {clinicTime}, in {slotMinutes}-minute appointments.
                  Adjust the days and hours any time from <span className="text-ink">Hours</span>.
                </p>
              )
            )}
          </div>

          {isEdit ? (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium text-ink">Taking appointments</p>
                <p className="text-xs text-muted-foreground">
                  When off, this doctor disappears from the USSD menu and the booking form.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">Give them a portal login</p>
                  <p className="text-xs text-muted-foreground">
                    They sign in with the standard starting password and can change it themselves.
                  </p>
                </div>
                <Switch checked={createAccount} onCheckedChange={setCreateAccount} />
              </div>

              {createAccount && (
                <div className="space-y-1.5">
                  <Label htmlFor="doctorUsername">Username</Label>
                  <Input
                    id="doctorUsername"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="e.g. a.boakye"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to build one from the full name.</p>
                </div>
              )}
            </div>
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
              'Add doctor'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
