'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Building2, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DataState, EmptyState, PageHeader, Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { cn, errorMessage } from '@/lib/utils';
import { DepartmentPicker } from '@/components/department-picker';
import type { Department } from '@/lib/types';

/**
 * Departments are the first screen of the USSD menu, so the order here is the
 * order patients see — hence the move-up/move-down controls rather than a
 * plain alphabetical list.
 */
export default function DepartmentsPage() {
  const { data, error, loading, reload } = useApi<{ departments: Department[] }>('/departments');
  const [formOpen, setFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [busy, setBusy] = useState(false);

  async function move(department: Department, direction: -1 | 1) {
    const list = data?.departments ?? [];
    const index = list.findIndex((d) => d.id === department.id);
    const swapWith = list[index + direction];
    if (!swapWith) return;

    setBusy(true);
    try {
      // Swap the two sort values so the change is a single visible step.
      await Promise.all([
        api.put(`/departments/${department.id}`, { sortOrder: swapWith.sort_order }),
        api.put(`/departments/${swapWith.id}`, { sortOrder: department.sort_order }),
      ]);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const { message } = await api.del<{ message: string }>(`/departments/${deleting.id}`);
      toast.success(message);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Departments"
        description="What patients see as the first screen of the USSD menu, in this order."
      >
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          <ListChecks className="h-4 w-4" /> Choose from common
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add department
        </Button>
      </PageHeader>

      <Alert variant="info" className="mb-5" title="Order matters">
        A patient on a feature phone sees these numbered 1, 2, 3… Put the busiest clinic first so the most common
        booking takes the fewest keystrokes. A department with no active doctor is hidden from the menu automatically.
      </Alert>

      <Card>
        <CardContent className="p-0">
          <DataState
            loading={loading}
            error={error}
            data={data}
            onRetry={reload}
            skeleton={<TableSkeleton rows={6} columns={5} />}
            isEmpty={(result) => result.departments.length === 0}
            empty={
              <EmptyState
                icon={Building2}
                title="No departments yet"
                description="Patients cannot book anything until at least one department exists."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setPickerOpen(true)}>
                      <ListChecks className="h-4 w-4" /> Choose from common departments
                    </Button>
                    <Button variant="outline" onClick={() => setFormOpen(true)}>
                      <Plus className="h-4 w-4" /> Add one myself
                    </Button>
                  </div>
                }
              />
            }
          >
            {(result) => (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Menu</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead className="text-right">Doctors</TableHead>
                      <TableHead className="text-right">Upcoming</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.departments.map((department, index) => (
                      <TableRow key={department.id} className={cn('row-hover', !department.is_active && 'opacity-55')}>
                        <TableCell>
                          <span className="font-mono text-sm tabular-nums text-muted-foreground">
                            {department.is_active && Number(department.doctor_count) > 0 ? index + 1 : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-ink">{department.name}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {department.code}
                            </Badge>
                            {!department.is_active && (
                              <Badge variant="outline" className="border-destructive/25 text-destructive">
                                Hidden
                              </Badge>
                            )}
                            {department.is_active && Number(department.doctor_count) === 0 && (
                              <Badge variant="outline" className="border-signal/40 bg-signal/10 text-amber-800">
                                No doctors — not on the menu
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {department.location || '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{department.doctor_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{department.upcoming_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Move up"
                              disabled={index === 0 || busy}
                              onClick={() => move(department, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Move down"
                              disabled={index === result.departments.length - 1 || busy}
                              onClick={() => move(department, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() => {
                                setEditing(department);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleting(department)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DataState>
        </CardContent>
      </Card>

      <DepartmentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        existing={data?.departments ?? []}
        onAdded={reload}
      />

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        department={editing}
        nextSortOrder={(data?.departments.length ?? 0) + 1}
        onSaved={reload}
      />

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. A department with doctors or appointment history cannot be deleted — deactivate it
              instead to take it off the USSD menu while keeping its records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? (
                <>
                  <Spinner /> Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */

function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
  nextSortOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  nextSortOrder: number;
  onSaved: () => void;
}) {
  const isEdit = Boolean(department);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [lastKey, setLastKey] = useState('');
  const key = `${open}-${department?.id ?? 'new'}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setName(department?.name ?? '');
      setCode(department?.code ?? '');
      setDescription(department?.description ?? '');
      setLocation(department?.location ?? '');
      setIsActive(department ? Boolean(department.is_active) : true);
      setError(null);
    }
  }

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        ...(isEdit ? { isActive } : { sortOrder: nextSortOrder }),
      };

      const result = isEdit
        ? await api.put<{ message: string }>(`/departments/${department!.id}`, payload)
        : await api.post<{ message: string }>('/departments', payload);

      toast.success(result.message);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'The department could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${department!.name}` : 'Add a department'}</DialogTitle>
          <DialogDescription>
            The name appears on the USSD menu, so keep it short enough to read on a feature phone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="space-y-1.5">
            <Label htmlFor="deptName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="deptName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. General Medicine"
              maxLength={60}
            />
            {name.length > 30 && (
              <p className="text-xs text-amber-700">
                Long names are shortened on the USSD screen. Under 30 characters reads best.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deptCode">Short code</Label>
              <Input
                id="deptCode"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Auto from the name"
                maxLength={20}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deptLocation">Location</Label>
              <Input
                id="deptLocation"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Block B, 1st floor"
              />
              <p className="text-xs text-muted-foreground">Included in confirmation emails.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deptDescription">Description</Label>
            <Textarea
              id="deptDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={255}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium text-ink">Show on the USSD menu</p>
                <p className="text-xs text-muted-foreground">
                  Turning this off hides the department from patients but keeps its history.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={name.trim().length < 2 || saving}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Add department'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
