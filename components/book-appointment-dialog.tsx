'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Check, Search, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/shared';
import { api, qs } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/use-api';
import { addDays, doctorName, formatDateLong, formatPhone, todayStr } from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import type { Appointment, Department, Doctor, Patient } from '@/lib/types';

/**
 * Front-desk booking.
 *
 * The same availability rules the USSD menu obeys are enforced here, because
 * both go through one endpoint — a slot the phone menu will not offer is a
 * slot this form will not offer either.
 *
 * The patient step accepts an existing record or registers a walk-in inline,
 * which is what actually happens at a counter.
 */
export function BookAppointmentDialog({
  open,
  onOpenChange,
  onBooked,
  presetPatient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked?: (appointment: Appointment) => void;
  presetPatient?: Pick<Patient, 'id' | 'full_name' | 'phone' | 'patient_code'> | null;
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search);

  const { data: departmentData } = useApi<{ departments: Department[] }>(open ? '/departments?status=active' : null);
  const { data: doctorData } = useApi<{ doctors: Doctor[] }>(
    open && departmentId ? `/doctors${qs({ departmentId, status: 'active' })}` : null
  );
  const { data: patientResults, loading: searching } = useApi<{ patients: Patient[] }>(
    open && mode === 'existing' && debouncedSearch.length >= 2
      ? `/patients${qs({ query: debouncedSearch, pageSize: 8 })}`
      : null
  );
  const { data: slotData, loading: loadingSlots } = useApi<{ slots: string[]; bookable: boolean; reason: string | null }>(
    open && doctorId && date ? `/appointments/slots${qs({ doctorId, date })}` : null
  );

  // Reset everything when the dialog is opened so a previous booking never
  // leaks into the next one.
  useEffect(() => {
    if (!open) return;
    setMode(presetPatient ? 'existing' : 'existing');
    setPatient((presetPatient as Patient) ?? null);
    setSearch('');
    setNewName('');
    setNewPhone('');
    setDepartmentId('');
    setDoctorId('');
    setDate(todayStr());
    setTime('');
    setReason('');
    setError(null);
  }, [open, presetPatient]);

  // Changing the doctor or the date invalidates the chosen time.
  useEffect(() => setTime(''), [doctorId, date]);
  useEffect(() => setDoctorId(''), [departmentId]);

  // Memoised so the identity is stable — otherwise the fallback [] is a new
  // array each render and every dependent memo recomputes.
  const doctors = useMemo(() => doctorData?.doctors ?? [], [doctorData]);
  const slots = slotData?.slots ?? [];

  const patientReady = mode === 'existing' ? Boolean(patient) : newName.trim().length >= 3 && newPhone.trim().length >= 9;
  const canSubmit = patientReady && Boolean(doctorId) && Boolean(date) && Boolean(time) && !submitting;

  const selectedDoctor = useMemo(() => doctors.find((d) => String(d.id) === doctorId), [doctors, doctorId]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      const payload =
        mode === 'existing'
          ? { patientId: patient!.id }
          : { patientName: newName.trim(), patientPhone: newPhone.trim() };

      const { appointment, message } = await api.post<{ appointment: Appointment; message: string }>(
        '/appointments',
        { ...payload, doctorId: Number(doctorId), date, time, reason: reason.trim() || undefined }
      );

      toast.success(message);
      onBooked?.(appointment);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'The appointment could not be booked.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>
            Booking at the desk. The patient gets the same confirmation SMS as a USSD booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && <Alert variant="danger">{error}</Alert>}

          {/* 1. Patient */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">1. Patient</h3>
              {!presetPatient && (
                <div className="flex rounded-md border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setMode('existing')}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      mode === 'existing' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('new')}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      mode === 'new' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    New walk-in
                  </button>
                </div>
              )}
            </div>

            {mode === 'existing' ? (
              patient ? (
                <div className="flex items-center justify-between rounded-md border border-primary/25 bg-primary/5 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{patient.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.patient_code} · {formatPhone(patient.phone)}
                    </p>
                  </div>
                  {!presetPatient && (
                    <Button variant="ghost" size="sm" onClick={() => setPatient(null)}>
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name, phone or patient ID…"
                      className="pl-9"
                    />
                  </div>

                  {search.length >= 2 && (
                    <div className="max-h-52 overflow-y-auto rounded-md border border-border">
                      {searching ? (
                        <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                          <Spinner /> Searching…
                        </p>
                      ) : (patientResults?.patients?.length ?? 0) === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No patient matched.{' '}
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={() => {
                              setMode('new');
                              setNewName(search);
                            }}
                          >
                            Register them as a walk-in
                          </button>
                          .
                        </div>
                      ) : (
                        patientResults!.patients.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => {
                              setPatient(result);
                              setSearch('');
                            }}
                            className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-secondary"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ink">{result.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {result.patient_code} · {formatPhone(result.phone)}
                              </p>
                            </div>
                            {!result.is_active && <span className="text-xs text-destructive">Inactive</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="walkinName">Full name</Label>
                  <Input
                    id="walkinName"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. Ama Boateng"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="walkinPhone">Phone number</Label>
                  <Input
                    id="walkinPhone"
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                    placeholder="0551234567"
                    inputMode="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    This becomes their USSD identity — they will be recognised when they dial in.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* 2. Doctor */}
          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-ink">2. Department and doctor</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departmentData?.departments ?? []).map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Doctor</Label>
                <Select value={doctorId} onValueChange={setDoctorId} disabled={!departmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={departmentId ? 'Choose a doctor' : 'Pick a department first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={String(doctor.id)}>
                        {doctorName(doctor.full_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departmentId && doctors.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active doctors in this department.</p>
                )}
              </div>
            </div>
          </section>

          {/* 3. Slot */}
          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-ink">3. Date and time</h3>

            <div className="space-y-1.5">
              <Label htmlFor="apptDate">Date</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="apptDate"
                  type="date"
                  value={date}
                  min={todayStr()}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-auto"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setDate(todayStr())}>
                  Today
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDate(addDays(todayStr(), 1))}>
                  Tomorrow
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Available times</Label>
              {!doctorId ? (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Choose a doctor to see their open slots.
                </p>
              ) : loadingSlots ? (
                <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Spinner /> Checking availability…
                </p>
              ) : slotData && !slotData.bookable ? (
                <Alert variant="warning">{slotData.reason}</Alert>
              ) : slots.length === 0 ? (
                <Alert variant="warning">
                  {selectedDoctor ? doctorName(selectedDoctor.full_name) : 'This doctor'} has no open slots on{' '}
                  {formatDateLong(date)}. Try another date.
                </Alert>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={cn(
                        'rounded-md border px-2 py-2 font-mono text-xs tabular-nums transition-colors',
                        time === slot
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-ink hover:border-primary/40 hover:bg-secondary'
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apptReason">Reason for the visit (optional)</Label>
              <Textarea
                id="apptReason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                maxLength={255}
                placeholder="e.g. Follow-up on blood pressure"
              />
            </div>
          </section>

          {canSubmit && (
            <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 text-sm">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-ink">
                <span className="font-medium">
                  {mode === 'existing' ? patient?.full_name : newName.trim()}
                </span>{' '}
                with {selectedDoctor ? doctorName(selectedDoctor.full_name) : 'the selected doctor'} on{' '}
                {formatDateLong(date)} at <span className="font-mono">{time}</span>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Spinner /> Booking…
              </>
            ) : (
              <>
                {mode === 'new' ? <UserPlus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                Confirm booking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
