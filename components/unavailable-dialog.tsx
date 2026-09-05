'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, CalendarX2, Check, UserRoundCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { formatDateShort, todayStr } from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import type { Doctor } from '@/lib/types';

/**
 * Taking a doctor off the board when something urgent happens.
 *
 * Two steps in one dialog, because doing the first without the second is what
 * strands patients: declare the absence, then deal with everyone caught by it.
 * The list is derived from the block rather than stored, so a patient moved to
 * a colleague disappears from it on the next read.
 */

export type Stranded = {
  id: number;
  reference: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  patient_phone: string;
  department_name: string;
};

type Cover = Record<number, { id: number; full_name: string }[]>;

type Scope = 'rest-of-today' | 'today' | 'range';

function nowHm() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function UnavailableDialog({
  open,
  onOpenChange,
  doctor,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Pick<Doctor, 'id' | 'full_name'>;
  onChanged?: () => void;
}) {
  const [scope, setScope] = useState<Scope>('rest-of-today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(nowHm);
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step two: who got caught.
  const [stranded, setStranded] = useState<Stranded[] | null>(null);
  const [cover, setCover] = useState<Cover>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setScope('rest-of-today');
      setStartDate(todayStr());
      setEndDate(todayStr());
      setStartTime(nowHm());
      setReason('');
      setNotify(true);
      setStranded(null);
      setCover({});
      setError(null);
    }
  }

  async function loadAffected() {
    const result = await api.get<{ affected: Stranded[]; cover: Cover }>(`/doctors/${doctor.id}/affected`);
    setStranded(result.affected);
    setCover(result.cover ?? {});
  }

  async function declare() {
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { reason: reason.trim() || undefined, notify };

      if (scope === 'rest-of-today') {
        payload.startDate = todayStr();
        payload.endDate = todayStr();
        payload.startTime = startTime;
      } else if (scope === 'today') {
        payload.startDate = todayStr();
        payload.endDate = todayStr();
      } else {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      const result = await api.post<{ message: string; affected: Stranded[] }>(
        `/doctors/${doctor.id}/time-off`,
        payload
      );
      toast.success(result.message);
      onChanged?.();
      // Show everyone caught by it, including any earlier block still running.
      await loadAffected();
    } catch (err) {
      setError(errorMessage(err, 'That could not be recorded.'));
    } finally {
      setSaving(false);
    }
  }

  /** Move one patient to a colleague, keeping the same date and time. */
  async function reassign(appointment: Stranded, toDoctorId: number) {
    setBusyId(appointment.id);
    try {
      await api.put(`/appointments/${appointment.id}/reschedule`, {
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        doctorId: toDoctorId,
      });
      toast.success(`${appointment.patient_name} moved.`);
      await loadAffected();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, 'That patient could not be moved.'));
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(appointment: Stranded) {
    setBusyId(appointment.id);
    try {
      await api.put(`/appointments/${appointment.id}/status`, {
        status: 'cancelled',
        note: reason.trim() || 'Doctor unavailable',
      });
      toast.success(`${appointment.patient_name}'s appointment cancelled.`);
      await loadAffected();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, 'That appointment could not be cancelled.'));
    } finally {
      setBusyId(null);
    }
  }

  /** One click for every patient a colleague can take at the same time. */
  async function reassignAllThatFit() {
    if (!stranded) return;
    setSaving(true);
    let moved = 0;
    for (const appointment of stranded) {
      const options = cover[appointment.id] ?? [];
      if (options.length === 0) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await api.put(`/appointments/${appointment.id}/reschedule`, {
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          doctorId: options[0].id,
        });
        moved += 1;
      } catch {
        // Left on the list for a human to deal with.
      }
    }
    setSaving(false);
    toast[moved > 0 ? 'success' : 'info'](
      moved > 0 ? `${moved} patient(s) moved to a colleague.` : 'Nobody could be moved automatically.'
    );
    await loadAffected();
    onChanged?.();
  }

  const name = `Dr. ${doctor.full_name.replace(/^Dr\.?\s*/i, '')}`;
  const fixable = stranded?.filter((a) => (cover[a.id] ?? []).length > 0).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX2 className="h-4 w-4 text-destructive" />
            {stranded === null ? `Mark ${name} unavailable` : 'Patients caught by this'}
          </DialogTitle>
          <DialogDescription>
            {stranded === null
              ? 'Closes their remaining slots on both channels straight away, then shows you who was already booked in.'
              : 'Move each one to a colleague who is free at the same time, or cancel and let them rebook.'}
          </DialogDescription>
        </DialogHeader>

        {stranded === null ? (
          <div className="space-y-4 py-2">
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="space-y-2">
              <Label>How long?</Label>
              {(
                [
                  ['rest-of-today', 'The rest of today', 'Keeps this morning’s patients, closes everything from a time onward.'],
                  ['today', 'All of today', 'The whole day, including anyone already booked this morning.'],
                  ['range', 'A range of dates', 'Planned leave, or an absence lasting more than a day.'],
                ] as [Scope, string, string][]
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    scope === value
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-card hover:border-primary/35 hover:bg-primary/5'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      scope === value ? 'border-primary bg-primary text-white' : 'border-input'
                    )}
                  >
                    {scope === value && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {scope === 'rest-of-today' && (
              <div className="space-y-1.5">
                <Label htmlFor="fromTime">Unavailable from</Label>
                <Input
                  id="fromTime"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-[140px]"
                />
                <p className="text-xs text-muted-foreground">
                  Anyone already seen before this time is left exactly as they are.
                </p>
              </div>
            )}

            {scope === 'range' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fromDate">From</Label>
                  <Input id="fromDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="toDate">To</Label>
                  <Input id="toDate" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Emergency theatre"
              />
              <p className="text-xs text-muted-foreground">Recorded in the audit log. Not sent to patients.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={notify}
                onChange={(event) => setNotify(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">Text the affected patients now</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Tells them not to travel. Most book over USSD from a basic phone, so this is usually the only way to
                  reach them in time.
                </span>
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {stranded.length === 0 ? (
              <Alert variant="success" title="Nobody was affected">
                No live appointments fall inside that window, so there is nothing to rearrange.
              </Alert>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {stranded.length} to rearrange · {fixable} can go to a colleague at the same time
                  </p>
                  {fixable > 0 && (
                    <Button size="sm" variant="outline" onClick={reassignAllThatFit} disabled={saving}>
                      {saving ? <Spinner /> : <UserRoundCheck className="h-3.5 w-3.5" />} Move all that fit
                    </Button>
                  )}
                </div>

                {stranded.map((appointment) => {
                  const options = cover[appointment.id] ?? [];
                  return (
                    <div key={appointment.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">
                            {appointment.patient_name}{' '}
                            <span className="font-mono text-xs text-muted-foreground">{appointment.reference}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateShort(appointment.appointment_date)} at {appointment.appointment_time} ·{' '}
                            {appointment.patient_phone}
                          </p>
                        </div>
                        {options.length === 0 && (
                          <Badge variant="outline" className="border-signal/40 bg-signal/10 text-amber-800">
                            <AlertTriangle className="mr-1 h-3 w-3" /> No cover
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {options.map((colleague) => (
                          <Button
                            key={colleague.id}
                            size="sm"
                            variant="outline"
                            disabled={busyId === appointment.id}
                            onClick={() => reassign(appointment, colleague.id)}
                          >
                            <ArrowRight className="h-3.5 w-3.5" /> Dr. {colleague.full_name.replace(/^Dr\.?\s*/i, '')}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === appointment.id}
                          onClick={() => cancel(appointment)}
                        >
                          Cancel it
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <p className="text-xs text-muted-foreground">
                  Anyone left here keeps their appointment. They have been told the doctor is unavailable, so the front
                  desk can call them back to rebook.
                </p>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {stranded === null ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={declare} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner /> Blocking…
                  </>
                ) : (
                  <>
                    <CalendarX2 className="h-4 w-4" /> Mark unavailable
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
