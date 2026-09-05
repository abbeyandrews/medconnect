'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { STATUS_LABELS } from '@/lib/format';
import { allowedStatuses, cn, errorMessage } from '@/lib/utils';
import type { Appointment, AppointmentStatus } from '@/lib/types';

/**
 * The status control used on the list and the detail screen.
 *
 * Only transitions the API would actually accept for this role are offered, so
 * the menu never shows an action that returns an error. A cancellation asks for
 * a reason, because that reason reaches the patient's SMS.
 */
export function StatusActions({
  appointment,
  onChanged,
  size = 'sm',
}: {
  appointment: Appointment;
  onChanged?: (appointment: Appointment) => void;
  size?: 'sm' | 'default';
}) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const options = user ? allowedStatuses(user.role, appointment.status) : [];

  async function apply(status: AppointmentStatus, note?: string) {
    setPending(true);
    try {
      const { appointment: updated, message } = await api.put<{ appointment: Appointment; message: string }>(
        `/appointments/${appointment.id}/status`,
        { status, note }
      );
      toast.success(message);
      onChanged?.(updated);
      setCancelOpen(false);
      setCancelReason('');
    } catch (err) {
      toast.error(errorMessage(err, 'That status could not be applied.'));
    } finally {
      setPending(false);
    }
  }

  if (options.length === 0) {
    return <span className="text-xs text-muted-foreground">No further action</span>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} disabled={pending}>
            {pending ? <Spinner /> : null}
            Update
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {options.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => (status === 'cancelled' ? setCancelOpen(true) : apply(status))}
              className={cn(status === 'cancelled' && 'text-destructive focus:text-destructive')}
            >
              Mark {STATUS_LABELS[status].toLowerCase()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel appointment {appointment.reference}?</DialogTitle>
            <DialogDescription>
              The slot is released immediately and {appointment.patient_name} is sent a cancellation SMS. This
              cannot be undone — you would need to book a new appointment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="cancelReason">Reason (included in the message)</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              maxLength={255}
              placeholder="e.g. Doctor called to theatre"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={pending}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => apply('cancelled', cancelReason.trim() || undefined)}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Spinner /> Cancelling…
                </>
              ) : (
                'Cancel appointment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
