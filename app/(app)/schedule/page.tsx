'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarOff, CalendarX2, ChevronLeft, ChevronRight, Clock, Plane } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DataState, EmptyState, PageHeader, StatusBadge, ChannelBadge } from '@/components/shared';
import { qs } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { UnavailableDialog } from '@/components/unavailable-dialog';
import { addDays, doctorName, formatDateLong, formatDateShort, formatPhone, todayStr } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DaySchedule, Doctor } from '@/lib/types';

/**
 * A doctor's day, slot by slot.
 *
 * Booked slots are shown rather than hidden, because the question staff are
 * usually answering is "who is coming and when is there a gap?", not just
 * "what is free?".
 */
export default function SchedulePage() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [doctorId, setDoctorId] = useState<string>(isDoctor && user?.doctorId ? String(user.doctorId) : '');
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  const [date, setDate] = useState(todayStr());

  const { data: doctorData } = useApi<{ doctors: Doctor[] }>(isDoctor ? null : '/doctors?status=active');

  // Staff need a doctor selected before there is anything to draw.
  useEffect(() => {
    if (isDoctor || doctorId) return;
    const first = doctorData?.doctors?.[0];
    if (first) setDoctorId(String(first.id));
  }, [doctorData, doctorId, isDoctor]);

  const { data, error, loading, reload } = useApi<DaySchedule>(
    doctorId ? `/doctors/${doctorId}/schedule${qs({ date })}` : null
  );

  const { data: weekData, reload: reloadWeek } = useApi<{ start: string; days: { date: string; dayName: string; hasClinic: boolean; onLeave: boolean; booked: number; free: number }[] }>(
    doctorId ? `/doctors/${doctorId}/week${qs({ start: date })}` : null
  );

  const selectedDoctor = doctorData?.doctors.find((d) => String(d.id) === doctorId);

  return (
    <>
      <PageHeader
        title="Schedule"
        description={
          isDoctor ? 'Your clinic, slot by slot.' : 'Any doctor’s day, with free slots and who is booked into them.'
        }
      >
        {!isDoctor && (
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Choose a doctor" />
            </SelectTrigger>
            <SelectContent>
              {(doctorData?.doctors ?? []).map((doctor) => (
                <SelectItem key={doctor.id} value={String(doctor.id)}>
                  {doctorName(doctor.full_name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedDoctor && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setUnavailableOpen(true)}
          >
            <CalendarX2 className="h-4 w-4" /> Mark unavailable
          </Button>
        )}
      </PageHeader>

      {/* Week strip */}
      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
          {(weekData?.days ?? Array.from({ length: 7 })).map((day: any, index) =>
            day ? (
              <button
                key={day.date}
                onClick={() => setDate(day.date)}
                className={cn(
                  'min-w-[92px] flex-1 rounded-lg border p-2.5 text-left transition-colors',
                  day.date === date
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <p className={cn('text-[11px] font-medium', day.date === date ? 'text-white/70' : 'text-muted-foreground')}>
                  {formatDateShort(day.date)}
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums">
                  {day.onLeave ? 'On leave' : day.hasClinic ? `${day.booked} booked` : 'No clinic'}
                </p>
                {day.hasClinic && !day.onLeave && (
                  <p className={cn('text-[11px]', day.date === date ? 'text-white/60' : 'text-muted-foreground')}>
                    {day.free} free
                  </p>
                )}
              </button>
            ) : (
              <Skeleton key={index} className="h-[70px] min-w-[92px] flex-1" />
            )
          )}
        </div>

        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-auto" />
        <Button variant="outline" size="sm" onClick={() => setDate(todayStr())}>
          Today
        </Button>
      </div>

      {!doctorId ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState title="Choose a doctor" description="Pick a doctor above to see their schedule." />
          </CardContent>
        </Card>
      ) : (
        <DataState
          loading={loading}
          error={error}
          data={data}
          onRetry={reload}
          skeleton={
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          }
        >
          {(day) => (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{formatDateLong(day.date)}</CardTitle>
                  <CardDescription>
                    {selectedDoctor ? `${doctorName(selectedDoctor.full_name)} · ` : ''}
                    {day.hasClinic
                      ? `${day.bookedCount} booked, ${day.freeCount} free`
                      : 'No clinic hours set for this weekday'}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {day.onLeave && (
                  <Alert variant="warning" className="mb-4" title="On leave">
                    This doctor is marked as away on this date. No slots are offered on either channel.
                  </Alert>
                )}

                {!day.hasClinic ? (
                  <EmptyState
                    icon={CalendarOff}
                    title="No clinic on this day"
                    description={
                      isDoctor
                        ? 'Set your weekly hours from the Doctors screen to open slots on this weekday.'
                        : 'This doctor has no clinic window configured for this weekday.'
                    }
                  />
                ) : day.slots.length === 0 ? (
                  <EmptyState icon={Plane} title="Nothing scheduled" />
                ) : (
                  <div className="space-y-1.5">
                    {day.slots.map((slot) => (
                      <div
                        key={slot.time}
                        className={cn(
                          'flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors',
                          slot.appointment
                            ? 'border-border bg-card'
                            : slot.status === 'unavailable'
                              ? 'border-dashed border-border bg-muted/40'
                              : 'border-dashed border-primary/25 bg-primary/[0.03]'
                        )}
                      >
                        <div className="flex w-16 shrink-0 items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm tabular-nums text-ink">{slot.time}</span>
                        </div>

                        {slot.appointment ? (
                          <>
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/appointments/${slot.appointment.id}`}
                                className="font-medium text-ink hover:underline"
                              >
                                {slot.appointment.patient_name}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {slot.appointment.patient_code} · {formatPhone(slot.appointment.patient_phone)}
                                {slot.appointment.reason ? ` · ${slot.appointment.reason}` : ''}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <ChannelBadge channel={slot.appointment.channel} />
                              <StatusBadge status={slot.appointment.status} />
                            </div>
                          </>
                        ) : (
                          <span className="flex-1 text-sm text-muted-foreground">
                            {slot.status === 'unavailable' ? 'Unavailable' : 'Free'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </DataState>
      )}

      {selectedDoctor && (
        <UnavailableDialog
          open={unavailableOpen}
          onOpenChange={setUnavailableOpen}
          doctor={selectedDoctor}
          onChanged={() => {
            reload();
            reloadWeek();
          }}
        />
      )}
    </>
  );
}
