'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarClock,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Save,
  Stethoscope,
  User,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CenteredSpinner,
  ChannelBadge,
  DataState,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
} from '@/components/shared';
import { StatusActions } from '@/components/status-actions';
import { RescheduleDialog } from '@/components/reschedule-dialog';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import {
  calculateAge,
  doctorName,
  formatDateLong,
  formatDateTime,
  formatPhone,
  formatRelative,
  formatTime,
  STATUS_LABELS,
} from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import type { Appointment, NotificationLog, StatusHistoryEntry } from '@/lib/types';

type Detail = {
  appointment: Appointment;
  history: StatusHistoryEntry[];
  messages: NotificationLog[];
};

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data, error, loading, reload } = useApi<Detail>(`/appointments/${params.id}`);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  if (loading && !data) return <CenteredSpinner label="Loading appointment…" />;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <DataState loading={loading} error={error} data={data} onRetry={reload}>
        {({ appointment, history, messages }) => (
          <>
            <PageHeader
              title={appointment.reference}
              description={`${formatDateLong(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)} · ${appointment.slot_minutes} minutes`}
            >
              <StatusBadge status={appointment.status} className="text-sm" />
              <ChannelBadge channel={appointment.channel} />
              {!['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
                <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
                  <CalendarClock className="h-4 w-4" /> Reschedule
                </Button>
              )}
              <StatusActions appointment={appointment} onChanged={reload} />
            </PageHeader>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4 text-primary" /> Patient
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-4 sm:grid-cols-3">
                      <Field label="Name">
                        <Link href={`/patients/${appointment.patient_id}`} className="text-primary hover:underline">
                          {appointment.patient_name}
                        </Link>
                      </Field>
                      <Field label="Patient ID">
                        <span className="font-mono text-xs">{appointment.patient_code}</span>
                      </Field>
                      <Field label="Phone">
                        <a href={`tel:${appointment.patient_phone}`} className="hover:underline">
                          {formatPhone(appointment.patient_phone)}
                        </a>
                      </Field>
                      <Field label="Age">
                        {calculateAge(appointment.patient_dob) !== null
                          ? `${calculateAge(appointment.patient_dob)} years`
                          : '—'}
                      </Field>
                      <Field label="Gender">
                        <span className="capitalize">{appointment.patient_gender || '—'}</span>
                      </Field>
                      <Field label="Email">{appointment.patient_email || '—'}</Field>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Stethoscope className="h-4 w-4 text-primary" /> Appointment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-4 sm:grid-cols-3">
                      <Field label="Doctor">{doctorName(appointment.doctor_name)}</Field>
                      <Field label="Department">{appointment.department_name}</Field>
                      <Field label="Room">{appointment.doctor_room || '—'}</Field>
                      <Field label="Booked">{formatDateTime(appointment.created_at)}</Field>
                      <Field label="Booked by">
                        {appointment.channel === 'ussd' ? (
                          <span className="text-tech">The patient, over USSD</span>
                        ) : (
                          appointment.booked_by_name || 'Front desk'
                        )}
                      </Field>
                      <Field label="Reminder sent">
                        {appointment.reminder_sent_at ? formatDateTime(appointment.reminder_sent_at) : 'Not yet'}
                      </Field>
                    </dl>

                    {appointment.reason && (
                      <>
                        <Separator className="my-4" />
                        <Field label="Reason given">{appointment.reason}</Field>
                      </>
                    )}

                    {appointment.cancel_reason && (
                      <Alert variant="danger" className="mt-4" title="Cancellation reason">
                        {appointment.cancel_reason}
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <ConsultationNotes appointment={appointment} onSaved={reload} />
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">History</CardTitle>
                    <CardDescription>Every change to this appointment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">Nothing recorded.</p>
                    ) : (
                      <ol className="relative space-y-4 border-l border-border pl-5">
                        {history.map((entry) => (
                          <li key={entry.id} className="relative">
                            <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                            <p className="text-sm font-medium text-ink">
                              {entry.from_status
                                ? `${STATUS_LABELS[entry.from_status as keyof typeof STATUS_LABELS] ?? entry.from_status} → ${
                                    STATUS_LABELS[entry.to_status as keyof typeof STATUS_LABELS] ?? entry.to_status
                                  }`
                                : `Created as ${STATUS_LABELS[entry.to_status as keyof typeof STATUS_LABELS] ?? entry.to_status}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.actor_type === 'patient_ussd'
                                ? 'Patient, over USSD'
                                : entry.actor_name || 'System'}{' '}
                              · {formatRelative(entry.created_at)}
                            </p>
                            {entry.note && <p className="mt-1 text-xs italic text-muted-foreground">{entry.note}</p>}
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Messages</CardTitle>
                    <CardDescription>What the patient was sent</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {messages.length === 0 ? (
                      <EmptyState icon={MessageSquare} title="No messages yet" />
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="rounded-md border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                              {message.channel === 'sms' ? (
                                <Phone className="h-3 w-3" />
                              ) : (
                                <Mail className="h-3 w-3" />
                              )}
                              {message.channel.toUpperCase()}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                message.status === 'sent' && 'border-primary/25 bg-primary/10 text-primary',
                                message.status === 'failed' &&
                                  'border-destructive/25 bg-destructive/10 text-destructive',
                                message.status === 'skipped' && 'border-border bg-secondary text-muted-foreground'
                              )}
                            >
                              {message.status}
                            </Badge>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {message.message.slice(0, 220)}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {message.recipient} · {formatRelative(message.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <RescheduleDialog
              open={rescheduleOpen}
              onOpenChange={setRescheduleOpen}
              appointment={appointment}
              onRescheduled={reload}
            />
          </>
        )}
      </DataState>
    </>
  );
}

/** Written by the attending doctor (or an administrator) after the visit. */
function ConsultationNotes({ appointment, onSaved }: { appointment: Appointment; onSaved: () => void }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState(appointment.clinical_notes || '');
  const [saving, setSaving] = useState(false);

  const canEdit =
    user?.role === 'admin' || (user?.role === 'doctor' && user.doctorId === appointment.doctor_id);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/appointments/${appointment.id}/notes`, { notes });
      toast.success('Consultation notes saved.');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit && !appointment.clinical_notes) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="h-4 w-4 text-primary" /> Consultation notes
        </CardTitle>
        <CardDescription>
          {canEdit
            ? 'Visible to the attending doctor and administrators. Not sent to the patient.'
            : 'Recorded by the attending doctor.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit ? (
          <>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={6}
              placeholder="Findings, treatment, follow-up…"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={saving || notes === (appointment.clinical_notes || '')}>
                {saving ? (
                  <>
                    <Spinner /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save notes
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-ink">{appointment.clinical_notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
