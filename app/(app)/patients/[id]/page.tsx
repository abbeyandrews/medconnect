'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, CalendarPlus, Pencil, Smartphone, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CenteredSpinner,
  ChannelBadge,
  DataState,
  EmptyState,
  Field,
  PageHeader,
  StatusBadge,
} from '@/components/shared';
import { PatientFormDialog } from '@/components/patient-form-dialog';
import { BookAppointmentDialog } from '@/components/book-appointment-dialog';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import {
  calculateAge,
  doctorName,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatPhone,
  formatRelative,
  formatTime,
} from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import type { Appointment, NotificationLog, Patient } from '@/lib/types';

type PatientDetail = {
  patient: Patient;
  appointments: Appointment[];
  messages: NotificationLog[];
  ussdActivity: {
    session_id: string;
    stage: string;
    step_count: number;
    ended: number;
    end_reason: string | null;
    created_at: string;
  }[];
};

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data, error, loading, reload } = useApi<PatientDetail>(`/patients/${params.id}`);
  const [editOpen, setEditOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'receptionist';

  async function toggleActive(patient: Patient) {
    setTogglingStatus(true);
    try {
      const { message } = await api.put<{ message: string }>(`/patients/${patient.id}/status`, {
        isActive: !patient.is_active,
      });
      toast.success(message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTogglingStatus(false);
    }
  }

  if (loading && !data) return <CenteredSpinner label="Loading patient record…" />;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <DataState loading={loading} error={error} data={data} onRetry={reload}>
        {({ patient, appointments, messages, ussdActivity }) => {
          const upcoming = appointments.filter(
            (a) => ['pending', 'confirmed', 'checked_in'].includes(a.status) && a.appointment_date >= new Date().toISOString().slice(0, 10)
          );
          const past = appointments.filter((a) => !upcoming.includes(a));

          return (
            <>
              <PageHeader title={patient.full_name} description={`${patient.patient_code} · ${formatPhone(patient.phone)}`}>
                {patient.source === 'ussd' && (
                  <Badge variant="outline" className="border-tech/25 bg-tech/10 text-tech">
                    <Smartphone className="mr-1 h-3 w-3" /> Self-registered
                  </Badge>
                )}
                {!patient.is_active && (
                  <Badge variant="outline" className="border-destructive/25 bg-destructive/10 text-destructive">
                    Inactive
                  </Badge>
                )}
                {canManage && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(patient)}
                      disabled={togglingStatus}
                      className={cn(patient.is_active && 'text-destructive hover:text-destructive')}
                    >
                      {patient.is_active ? (
                        <>
                          <UserX className="h-4 w-4" /> Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" /> Reactivate
                        </>
                      )}
                    </Button>
                    <Button size="sm" onClick={() => setBookOpen(true)} disabled={!patient.is_active}>
                      <CalendarPlus className="h-4 w-4" /> Book
                    </Button>
                  </>
                )}
              </PageHeader>

              {!patient.is_active && (
                <Alert variant="warning" className="mb-6" title="This record is deactivated">
                  This patient cannot book over USSD and no new appointments can be made for them. Their history is
                  kept.
                </Alert>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <Field label="Patient ID">
                        <span className="font-mono text-xs">{patient.patient_code}</span>
                      </Field>
                      <Field label="Phone (USSD identity)">
                        <a href={`tel:${patient.phone}`} className="hover:underline">
                          {formatPhone(patient.phone)}
                        </a>
                      </Field>
                      {patient.alt_phone && <Field label="Alternate phone">{formatPhone(patient.alt_phone)}</Field>}
                      <Field label="Email">{patient.email || '—'}</Field>
                      <Field label="Date of birth">
                        {patient.date_of_birth
                          ? `${formatDate(patient.date_of_birth)} (${calculateAge(patient.date_of_birth)} yrs)`
                          : '—'}
                      </Field>
                      <Field label="Gender">
                        <span className="capitalize">{patient.gender || '—'}</span>
                      </Field>
                      <Field label="Blood group">{patient.blood_group || '—'}</Field>
                      <Field label="National ID">{patient.national_id || '—'}</Field>
                      <Field label="Address">{patient.address || '—'}</Field>
                      <Field label="Next of kin">
                        {patient.next_of_kin_name
                          ? `${patient.next_of_kin_name}${patient.next_of_kin_phone ? ` · ${formatPhone(patient.next_of_kin_phone)}` : ''}`
                          : '—'}
                      </Field>
                      <Field label="Registered">
                        {patient.source === 'ussd' ? 'By the patient, over USSD' : patient.registered_by_name || 'Front desk'}
                        <span className="block text-xs text-muted-foreground">{formatDateTime(patient.created_at)}</span>
                      </Field>
                      {patient.notes && <Field label="Records notes">{patient.notes}</Field>}
                    </dl>
                  </CardContent>
                </Card>

                <div className="space-y-6 lg:col-span-2">
                  <Tabs defaultValue="upcoming">
                    <TabsList>
                      <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
                      <TabsTrigger value="history">History ({past.length})</TabsTrigger>
                      <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
                      <TabsTrigger value="ussd">USSD ({ussdActivity.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming">
                      <Card>
                        <CardContent className="p-0">
                          {upcoming.length === 0 ? (
                            <EmptyState
                              title="No upcoming appointments"
                              description="They can book by dialling the short code, or you can book for them here."
                              action={
                                canManage && patient.is_active ? (
                                  <Button onClick={() => setBookOpen(true)}>
                                    <CalendarPlus className="h-4 w-4" /> Book an appointment
                                  </Button>
                                ) : undefined
                              }
                            />
                          ) : (
                            <AppointmentTable appointments={upcoming} />
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="history">
                      <Card>
                        <CardContent className="p-0">
                          {past.length === 0 ? (
                            <EmptyState title="No past visits" />
                          ) : (
                            <AppointmentTable appointments={past} />
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="messages">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Messages sent</CardTitle>
                          <CardDescription>Confirmations, reminders and cancellations</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {messages.length === 0 ? (
                            <EmptyState title="Nothing sent yet" />
                          ) : (
                            messages.map((message) => (
                              <div key={message.id} className="rounded-md border border-border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-medium uppercase text-ink">
                                    {message.channel} · {message.event.replace(/_/g, ' ')}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px]',
                                      message.status === 'sent' && 'border-primary/25 bg-primary/10 text-primary',
                                      message.status === 'failed' &&
                                        'border-destructive/25 bg-destructive/10 text-destructive'
                                    )}
                                  >
                                    {message.status}
                                  </Badge>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                                  {message.message}
                                </p>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  {formatRelative(message.created_at)}
                                </p>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="ussd">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">USSD activity</CardTitle>
                          <CardDescription>Recent sessions dialled from this number</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          {ussdActivity.length === 0 ? (
                            <EmptyState icon={Smartphone} title="They have not dialled in yet" />
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>When</TableHead>
                                  <TableHead>Ended on</TableHead>
                                  <TableHead>Screens</TableHead>
                                  <TableHead>Outcome</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ussdActivity.map((session) => (
                                  <TableRow key={session.session_id} className="row-hover">
                                    <TableCell className="text-sm">{formatDateTime(session.created_at)}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                      {session.stage}
                                    </TableCell>
                                    <TableCell className="tabular-nums">{session.step_count}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-[10px] capitalize">
                                        {session.end_reason || (session.ended ? 'ended' : 'active')}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} patient={patient} onSaved={reload} />
              <BookAppointmentDialog
                open={bookOpen}
                onOpenChange={setBookOpen}
                presetPatient={patient}
                onBooked={reload}
              />
            </>
          );
        }}
      </DataState>
    </>
  );
}

function AppointmentTable({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>When</TableHead>
            <TableHead className="hidden md:table-cell">Doctor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Via</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment.id} className="row-hover">
              <TableCell>
                <Link
                  href={`/appointments/${appointment.id}`}
                  className="font-mono text-xs font-medium text-primary hover:underline"
                >
                  {appointment.reference}
                </Link>
              </TableCell>
              <TableCell>
                <p className="text-sm text-ink">{formatDateShort(appointment.appointment_date)}</p>
                <p className="font-mono text-xs text-muted-foreground">{formatTime(appointment.appointment_time)}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <p className="text-sm">{doctorName(appointment.doctor_name)}</p>
                <p className="text-xs text-muted-foreground">{appointment.department_name}</p>
              </TableCell>
              <TableCell>
                <StatusBadge status={appointment.status} />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <ChannelBadge channel={appointment.channel} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
