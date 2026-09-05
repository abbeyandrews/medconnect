'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/utils';
import type { Patient } from '@/lib/types';

/**
 * Registering or editing a patient at the records desk.
 *
 * The phone number is the important field: it is how the USSD channel
 * recognises this person, so it is required and must be unique.
 */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMPTY = {
  fullName: '',
  phone: '',
  altPhone: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  nationalId: '',
  bloodGroup: '',
  address: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  notes: '',
};

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to register a new patient. */
  patient?: Patient | null;
  onSaved?: (patient: Patient) => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(patient);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      patient
        ? {
            fullName: patient.full_name || '',
            phone: patient.phone || '',
            altPhone: patient.alt_phone || '',
            email: patient.email || '',
            gender: patient.gender || '',
            dateOfBirth: patient.date_of_birth || '',
            nationalId: patient.national_id || '',
            bloodGroup: patient.blood_group || '',
            address: patient.address || '',
            nextOfKinName: patient.next_of_kin_name || '',
            nextOfKinPhone: patient.next_of_kin_phone || '',
            notes: patient.notes || '',
          }
        : EMPTY
    );
  }, [open, patient]);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canSubmit = form.fullName.trim().length >= 3 && form.phone.trim().length >= 9 && !submitting;

  async function submit() {
    setError(null);
    setSubmitting(true);

    // Empty strings would overwrite real values with '' — send undefined instead.
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value === '' ? undefined : value])
    );

    try {
      const result = isEdit
        ? await api.put<{ patient: Patient; message: string }>(`/patients/${patient!.id}`, payload)
        : await api.post<{ patient: Patient; message: string }>('/patients', payload);

      toast.success(result.message);
      onSaved?.(result.patient);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'The patient could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${patient!.full_name}` : 'Register a patient'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this patient’s record. Changing the phone number changes how USSD recognises them.'
              : 'Records-desk registration. The patient never signs in — they reach the system by dialling the short code from this number.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && <Alert variant="danger">{error}</Alert>}

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fullName">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(event) => set('fullName', event.target.value)}
                placeholder="e.g. Ama Boateng"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => set('phone', event.target.value)}
                placeholder="0551234567"
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground">Their USSD identity. Must be unique.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="altPhone">Alternate phone</Label>
              <Input
                id="altPhone"
                value={form.altPhone}
                onChange={(event) => set('altPhone', event.target.value)}
                inputMode="tel"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => set('dateOfBirth', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(value) => set('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Not recorded" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                placeholder="Used for email confirmations"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Blood group</Label>
              <Select value={form.bloodGroup} onValueChange={(value) => set('bloodGroup', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Not recorded" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nationalId">National ID</Label>
              <Input
                id="nationalId"
                value={form.nationalId}
                onChange={(event) => set('nationalId', event.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(event) => set('address', event.target.value)} />
            </div>
          </section>

          <section className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
            <p className="text-sm font-semibold text-ink sm:col-span-2">Next of kin</p>
            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinName">Name</Label>
              <Input
                id="nextOfKinName"
                value={form.nextOfKinName}
                onChange={(event) => set('nextOfKinName', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinPhone">Phone</Label>
              <Input
                id="nextOfKinPhone"
                value={form.nextOfKinPhone}
                onChange={(event) => set('nextOfKinPhone', event.target.value)}
                inputMode="tel"
              />
            </div>
          </section>

          <div className="space-y-1.5 border-t border-border pt-5">
            <Label htmlFor="notes">Records notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
              rows={3}
              placeholder="Anything the desk should know. Not clinical notes."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Spinner /> Saving…
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Register patient'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
