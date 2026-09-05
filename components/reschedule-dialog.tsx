'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/shared';
import { api, qs } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { addDays, doctorName, formatDateLong, formatTime, todayStr } from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import type { Appointment } from '@/lib/types';

/**
 * Moves an appointment to another slot, keeping the same reference — the code
 * the patient wrote down or was read over the phone stays valid.
 */
export function RescheduleDialog({
  open,
  onOpenChange,
  appointment,
  onRescheduled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  onRescheduled?: () => void;
}) {
  const [date, setDate] = useState(appointment.appointment_date);
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(appointment.appointment_date < todayStr() ? todayStr() : appointment.appointment_date);
    setTime('');
    setError(null);
  }, [open, appointment.appointment_date]);

  useEffect(() => setTime(''), [date]);

  const { data, loading } = useApi<{ slots: string[]; bookable: boolean; reason: string | null }>(
    open ? `/appointments/slots${qs({ doctorId: appointment.doctor_id, date })}` : null
  );

  const slots = data?.slots ?? [];

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const { message } = await api.put<{ message: string }>(`/appointments/${appointment.id}/reschedule`, {
        date,
        time,
      });
      toast.success(message);
      onRescheduled?.();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'The appointment could not be moved.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule {appointment.reference}</DialogTitle>
          <DialogDescription>
            Currently {formatDateLong(appointment.appointment_date)} at {formatTime(appointment.appointment_time)} with{' '}
            {doctorName(appointment.doctor_name)}. The reference stays the same and {appointment.patient_name} is
            texted the new time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="space-y-1.5">
            <Label htmlFor="newDate">New date</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="newDate"
                type="date"
                value={date}
                min={todayStr()}
                onChange={(event) => setDate(event.target.value)}
                className="w-auto"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setDate(addDays(todayStr(), 1))}>
                Tomorrow
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDate(addDays(todayStr(), 7))}>
                Next week
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>New time</Label>
            {loading ? (
              <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Spinner /> Checking availability…
              </p>
            ) : data && !data.bookable ? (
              <Alert variant="warning">{data.reason}</Alert>
            ) : slots.length === 0 ? (
              <Alert variant="warning">
                {doctorName(appointment.doctor_name)} has no open slots on {formatDateLong(date)}.
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!time || submitting}>
            {submitting ? (
              <>
                <Spinner /> Moving…
              </>
            ) : (
              'Move appointment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
