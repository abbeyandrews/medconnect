'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { WEEKDAYS } from '@/lib/format';
import { errorMessage } from '@/lib/utils';
import type { AvailabilityBand, Doctor } from '@/lib/types';

/**
 * The weekly clinic pattern that drives every slot both channels offer.
 *
 * Editing it here is the single lever that opens or closes appointment times —
 * there is no separate "slots" table to keep in step.
 */

// Slot length is typed rather than picked from a list, so any number of
// minutes between 5 and 240 is allowed (the API enforces the same bounds).

const WEEKDAY_TEMPLATE: AvailabilityBand[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '08:00',
  endTime: '16:00',
  slotMinutes: 30,
}));

export function AvailabilityEditor({
  open,
  onOpenChange,
  doctor,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Pick<Doctor, 'id' | 'full_name'>;
  initial: AvailabilityBand[];
  onSaved?: () => void;
}) {
  const [bands, setBands] = useState<AvailabilityBand[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBands(initial.length > 0 ? initial : []);
      setError(null);
    }
  }, [open, initial]);

  function update(index: number, patch: Partial<AvailabilityBand>) {
    setBands((current) => current.map((band, i) => (i === index ? { ...band, ...patch } : band)));
  }

  function add() {
    setBands((current) => [...current, { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotMinutes: 30 }]);
  }

  function remove(index: number) {
    setBands((current) => current.filter((_, i) => i !== index));
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api.put(`/doctors/${doctor.id}/availability`, { availability: bands });
      toast.success('Clinic hours updated.');
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'Those hours could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  // Rough capacity figure so the effect of a change is visible before saving.
  const weeklySlots = bands.reduce((total, band) => {
    const [startHour, startMinute] = band.startTime.split(':').map(Number);
    const [endHour, endMinute] = band.endTime.split(':').map(Number);
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    return total + (minutes > 0 ? Math.floor(minutes / (band.slotMinutes || 30)) : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clinic hours — Dr. {doctor.full_name.replace(/^Dr\.?\s*/i, '')}</DialogTitle>
          <DialogDescription>
            These windows generate the appointment slots offered on the USSD menu and at the front desk. Existing
            appointments are never removed by a change here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {error && <Alert variant="danger">{error}</Alert>}

          {bands.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No clinic hours set — this doctor cannot be booked on either channel.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setBands(WEEKDAY_TEMPLATE)}>
                  Use Mon–Fri, 08:00–16:00
                </Button>
                <Button size="sm" onClick={add}>
                  <Plus className="h-4 w-4" /> Add a window
                </Button>
              </div>
            </div>
          ) : (
            <>
              {bands.map((band, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
                  <div className="min-w-[130px] flex-1 space-y-1.5">
                    <Label className="text-xs">Day</Label>
                    <Select
                      value={String(band.dayOfWeek)}
                      onValueChange={(value) => update(index, { dayOfWeek: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((day, dayIndex) => (
                          <SelectItem key={day} value={String(dayIndex)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="time"
                      value={band.startTime}
                      onChange={(event) => update(index, { startTime: event.target.value })}
                      className="w-[120px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="time"
                      value={band.endTime}
                      onChange={(event) => update(index, { endTime: event.target.value })}
                      className="w-[120px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Minutes</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={5}
                      max={240}
                      value={band.slotMinutes}
                      onChange={(event) => update(index, { slotMinutes: Number(event.target.value) })}
                      className="w-[100px]"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    aria-label="Remove this window"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={add}>
                  <Plus className="h-4 w-4" /> Add a window
                </Button>
                <p className="text-xs text-muted-foreground">
                  About <span className="font-medium text-ink tabular-nums">{weeklySlots}</span> bookable slots a week
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : (
              'Save clinic hours'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
