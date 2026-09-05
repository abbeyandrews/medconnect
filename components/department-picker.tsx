'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { cn, errorMessage } from '@/lib/utils';
import type { Department } from '@/lib/types';

/**
 * The departments a general hospital usually runs an outpatient clinic for,
 * offered as a menu to tick rather than written into the database by a script.
 *
 * Which clinics exist is a decision about a particular hospital, so it stays a
 * decision made in the app. Anything missing is added with "Add department";
 * anything here that does not apply simply goes unticked.
 *
 * `location` is deliberately absent — only the hospital knows which block and
 * floor a clinic sits on, and it is read out to patients over USSD, so a guess
 * would send someone to the wrong building.
 */
export const COMMON_DEPARTMENTS = [
  { code: 'GEN',  name: 'General Medicine',        description: 'Everyday illness, check-ups and referrals.' },
  { code: 'PAED', name: 'Pediatrics',              description: 'Care for infants, children and adolescents.' },
  { code: 'OBGY', name: 'Obstetrics & Gynecology', description: 'Antenatal care, maternal and women’s health.' },
  { code: 'SURG', name: 'General Surgery',         description: 'Surgical consultation, review and follow-up.' },
  { code: 'CARD', name: 'Cardiology',              description: 'Heart and circulatory diagnosis and treatment.' },
  { code: 'ORTH', name: 'Orthopedics',             description: 'Bones, joints, fractures and physiotherapy referral.' },
  { code: 'DENT', name: 'Dental',                  description: 'Oral health, extractions and dental surgery.' },
  { code: 'EYE',  name: 'Ophthalmology',           description: 'Eye tests, vision problems and eye surgery.' },
  { code: 'ENT',  name: 'Ear, Nose & Throat',      description: 'Hearing, sinus, throat and related conditions.' },
  { code: 'DERM', name: 'Dermatology',             description: 'Skin, hair and nail conditions.' },
  { code: 'PHYS', name: 'Physiotherapy',           description: 'Rehabilitation, mobility and pain management.' },
  { code: 'MENT', name: 'Mental Health',           description: 'Counselling, psychiatric review and follow-up.' },
  { code: 'ANC',  name: 'Antenatal Clinic',        description: 'Routine pregnancy check-ups and monitoring.' },
  { code: 'FAM',  name: 'Family Planning',         description: 'Contraception advice and reproductive health.' },
  { code: 'NUTR', name: 'Nutrition',               description: 'Diet, weight and nutritional counselling.' },
  { code: 'URO',  name: 'Urology',                 description: 'Kidney, bladder and urinary tract conditions.' },
];

export function DepartmentPicker({
  open,
  onOpenChange,
  existing,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: Department[];
  onAdded: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Match on code and on name, so a department added by hand under the same
  // name is still recognised and cannot be created twice.
  const taken = new Set([
    ...existing.map((d) => d.code.toUpperCase()),
    ...existing.map((d) => d.name.trim().toLowerCase()),
  ]);
  const alreadyAdded = (item: (typeof COMMON_DEPARTMENTS)[number]) =>
    taken.has(item.code) || taken.has(item.name.toLowerCase());

  const available = COMMON_DEPARTMENTS.filter((item) => !alreadyAdded(item));

  // Reset the ticks whenever the dialog is reopened.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setChosen([]);
  }

  function toggle(code: string) {
    setChosen((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );
  }

  async function add() {
    setSaving(true);

    // Created one at a time and in list order, so the menu numbering patients
    // see matches the order shown here. One failure does not lose the rest.
    const startOrder = existing.length;
    const failures: string[] = [];
    let added = 0;

    for (const code of COMMON_DEPARTMENTS.map((d) => d.code).filter((c) => chosen.includes(c))) {
      const item = COMMON_DEPARTMENTS.find((d) => d.code === code)!;
      try {
        // eslint-disable-next-line no-await-in-loop
        await api.post('/departments', {
          name: item.name,
          code: item.code,
          description: item.description,
          sortOrder: startOrder + added + 1,
        });
        added += 1;
      } catch (err) {
        failures.push(`${item.name} (${errorMessage(err, 'failed')})`);
      }
    }

    setSaving(false);

    if (added > 0) toast.success(`${added} department${added === 1 ? '' : 's'} added.`);
    if (failures.length > 0) toast.error(`Could not add: ${failures.join(', ')}`);

    onAdded();
    if (failures.length === 0) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Common hospital departments</DialogTitle>
          <DialogDescription>
            Tick the clinics your hospital actually runs. Nothing is added until you say so, and you can rename,
            reorder or remove any of them afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {available.length === 0 ? (
            <Alert variant="success" title="All of them are already here">
              Every department on this list exists. Use <span className="text-ink">Add department</span> for anything
              specific to your hospital.
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {chosen.length === 0 ? 'None selected' : `${chosen.length} selected`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChosen(available.map((d) => d.code))}
                    disabled={saving || chosen.length === available.length}
                  >
                    Select all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setChosen([])} disabled={saving || chosen.length === 0}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {COMMON_DEPARTMENTS.map((item) => {
                  const added = alreadyAdded(item);
                  const picked = chosen.includes(item.code);

                  return (
                    <button
                      key={item.code}
                      type="button"
                      disabled={added || saving}
                      onClick={() => toggle(item.code)}
                      aria-pressed={picked}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                        added && 'cursor-not-allowed border-border bg-secondary/40 opacity-60',
                        !added && picked && 'border-primary/50 bg-primary/10',
                        !added && !picked && 'border-border bg-card hover:border-primary/35 hover:bg-primary/5'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                          picked || added ? 'border-primary bg-primary text-white' : 'border-input bg-background'
                        )}
                      >
                        {(picked || added) && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                        <span className="mt-1 block font-mono text-[10px] uppercase text-muted-foreground">
                          {added ? 'already added' : item.code}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Not on the list? Close this and use <span className="text-ink">Add department</span> to enter your own.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {available.length === 0 ? 'Close' : 'Cancel'}
          </Button>
          {available.length > 0 && (
            <Button onClick={add} disabled={chosen.length === 0 || saving}>
              {saving ? (
                <>
                  <Spinner /> Adding…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Add {chosen.length > 0 ? chosen.length : ''}{' '}
                  {chosen.length === 1 ? 'department' : 'departments'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
