'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  MessageSquareWarning,
  Smartphone,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataState, EmptyState, PageHeader, StatCard, StatusBadge, ChannelBadge } from '@/components/shared';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { doctorName, formatDateShort, formatTime, formatPhone } from '@/lib/format';
import { accentVars } from '@/lib/utils';
import type { Dashboard } from '@/lib/types';

/**
 * Chart ink, matched to the six board accents in globals.css so a bar and the
 * card it sits next to are recognisably the same colour.
 */
const CHART_COLORS = ['#319B74', '#2D81BE', '#F09D0F', '#8A61D1', '#DD4B7C', '#299995'];
const GREEN = CHART_COLORS[0];
const BLUE = CHART_COLORS[1];
const GRID = '#DCE8E2';
const AXIS = '#6B7F79';

const TOOLTIP_STYLE = { borderRadius: 10, border: '1px solid #DCE8E2', fontSize: 12 } as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Dashboard>('/dashboard');

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.fullName ?? ''}`}
        description={
          user?.role === 'doctor'
            ? 'Your clinic at a glance.'
            : 'Appointments across both channels, as they stand right now.'
        }
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/appointments">All appointments</Link>
        </Button>
        {user?.role !== 'doctor' && (
          <Button size="sm" asChild>
            <Link href="/appointments?new=1">Book an appointment</Link>
          </Button>
        )}
      </PageHeader>

      <DataState loading={loading} error={error} data={data} onRetry={reload}>
        {(dashboard) =>
          dashboard.scope === 'doctor' ? (
            <DoctorView dashboard={dashboard} />
          ) : (
            <HospitalView dashboard={dashboard} />
          )
        }
      </DataState>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Administrator / receptionist                                        */
/* ------------------------------------------------------------------ */

function HospitalView({ dashboard }: { dashboard: Dashboard }) {
  const { stats, trend = [], byDepartment = [], channelSplit = [], today = [] } = dashboard;

  const channelData = channelSplit.map((entry) => ({
    name: entry.channel === 'ussd' ? 'USSD' : 'Front desk',
    value: Number(entry.count),
  }));
  const totalBookings = channelData.reduce((sum, entry) => sum + entry.value, 0);
  const ussdShare = totalBookings
    ? Math.round(((channelData.find((c) => c.name === 'USSD')?.value ?? 0) / totalBookings) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Each board carries its own accent, so the row reads as four things. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={stats.today} hint="Live appointments today" icon={CalendarCheck} accent={0} />
        <StatCard
          label="Awaiting confirmation"
          value={stats.pending}
          hint="Booked, not yet confirmed"
          icon={CalendarClock}
          accent={2}
        />
        <StatCard
          label="Registered patients"
          value={stats.patients}
          hint={`${stats.patientsFromUssd} via USSD`}
          icon={Users}
          accent={1}
          href="/patients"
        />
        <StatCard label="Active doctors" value={stats.doctors} icon={Stethoscope} accent={3} href="/doctors" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card style={accentVars(1)} className="tile lg:col-span-2">
          <CardHeader>
            <CardTitle>Bookings by channel</CardTitle>
            <CardDescription>
              The last 14 days. USSD is the patient-facing channel; front desk is booked by staff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <EmptyState title="No bookings in the last two weeks" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend.map((d) => ({ ...d, label: formatDateShort(d.date).slice(0, 6) }))}>
                  <defs>
                    <linearGradient id="ussdFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} stopOpacity={0.38} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="webFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.34} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#1F3733', fontWeight: 500 }} />
                  <Area type="monotone" dataKey="ussd" name="USSD" stroke={BLUE} fill="url(#ussdFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="web" name="Front desk" stroke={GREEN} fill="url(#webFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card style={accentVars(5)} className="tile">
          <CardHeader>
            <CardTitle>Channel mix</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {totalBookings === 0 ? (
              <EmptyState title="No bookings yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={channelData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                      {channelData.map((entry, index) => (
                        <Cell key={entry.name} fill={index === 0 ? BLUE : GREEN} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="tile-value text-center font-display text-2xl text-ink">{ussdShare}%</p>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  of bookings arrived over USSD — patients who needed no smartphone and no internet.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card style={accentVars(0)} className="tile lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Today&apos;s clinic</CardTitle>
              <CardDescription>{today.length} appointment(s) scheduled today</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/appointments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {today.length === 0 ? (
              <EmptyState title="Nothing booked for today" description="New bookings will appear here as they arrive." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Via</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {today.slice(0, 8).map((appointment) => (
                      <TableRow key={appointment.id} className="row-hover">
                        <TableCell className="font-mono text-xs tabular-nums">
                          {formatTime(appointment.appointment_time)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/appointments/${appointment.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                            {appointment.patient_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatPhone(appointment.patient_phone)}</p>
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">{doctorName(appointment.doctor_name)}</TableCell>
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
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card style={accentVars(3)} className="tile">
            <CardHeader>
              <CardTitle>Busiest departments</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {byDepartment.length === 0 ? (
                <EmptyState title="No data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={byDepartment.slice(0, 6)} layout="vertical" margin={{ left: 6, right: 10 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={92}
                      tick={{ fontSize: 10, fill: AXIS }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 13)}…` : value)}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#EFF6F2' }} />
                    <Bar dataKey="count" name="Appointments" radius={[0, 4, 4, 0]}>
                      {byDepartment.slice(0, 6).map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card style={accentVars(4)} className="tile">
            <CardHeader>
              <CardTitle>Channel health</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <HealthRow
                icon={Smartphone}
                label="USSD sessions"
                value={stats.ussdSessions7}
                hint={`${stats.ussdCompleted7} reached a result`}
                href="/ussd"
                accent={1}
              />
              <HealthRow
                icon={UserPlus}
                label="New patients (30d)"
                value={stats.newPatients30}
                hint={`${stats.patientsFromUssd} registered themselves over USSD`}
                href="/patients"
                accent={0}
              />
              <HealthRow
                icon={MessageSquareWarning}
                label="Failed messages"
                value={stats.failedMessages7}
                hint={stats.failedMessages7 > 0 ? 'Check the message log' : 'Nothing failed'}
                href="/reports"
                accent={4}
                tone={stats.failedMessages7 > 0 ? 'danger' : undefined}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HealthRow({
  icon: Icon,
  label,
  value,
  hint,
  href,
  accent = 0,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  href: string;
  accent?: number;
  tone?: 'danger';
}) {
  const danger = tone === 'danger';
  return (
    <Link
      href={href}
      style={danger ? undefined : accentVars(accent)}
      className={`tile-row flex items-center gap-3 rounded-md p-2 ${danger ? '[--tile:var(--destructive)]' : ''}`}
    >
      <span className="tile-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <span className={`font-display text-xl tabular-nums ${danger ? 'text-destructive' : 'text-ink'}`}>{value}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Doctor                                                              */
/* ------------------------------------------------------------------ */

function DoctorView({ dashboard }: { dashboard: Dashboard }) {
  const { stats, today = [], next = [], weekLoad = [] } = dashboard;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={stats.today} hint="Patients booked with you" icon={CalendarCheck} accent={0} />
        <StatCard
          label="Waiting now"
          value={stats.waiting}
          hint="Checked in at reception"
          icon={ClipboardCheck}
          accent={1}
        />
        <StatCard label="Upcoming" value={stats.upcoming} hint="Beyond today" icon={CalendarClock} accent={2} />
        <StatCard label="Seen (30 days)" value={stats.completed30} icon={Stethoscope} accent={5} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card style={accentVars(0)} className="tile lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Your clinic today</CardTitle>
              <CardDescription>
                {today.length === 0 ? 'Nothing booked' : `${today.length} patient(s) in order of appointment`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/schedule">Open schedule</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {today.length === 0 ? (
              <EmptyState title="No patients booked today" description="Your day is clear." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {today.map((appointment) => (
                      <TableRow key={appointment.id} className="row-hover">
                        <TableCell className="font-mono text-xs tabular-nums">
                          {formatTime(appointment.appointment_time)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/appointments/${appointment.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                            {appointment.patient_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{appointment.patient_code}</p>
                        </TableCell>
                        <TableCell className="hidden max-w-[220px] truncate text-sm text-muted-foreground md:table-cell">
                          {appointment.reason || '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={appointment.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card style={accentVars(2)} className="tile">
            <CardHeader>
              <CardTitle>Week ahead</CardTitle>
              <CardDescription>Appointments per day</CardDescription>
            </CardHeader>
            <CardContent>
              {weekLoad.length === 0 ? (
                <EmptyState title="Nothing booked this week" />
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={weekLoad.map((d) => ({ ...d, label: formatDateShort(d.date).slice(0, 3) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#EFF6F2' }} />
                    <Bar dataKey="count" name="Appointments" radius={[4, 4, 0, 0]}>
                      {weekLoad.map((entry, index) => (
                        <Cell key={entry.date} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card style={accentVars(4)} className="tile">
            <CardHeader>
              <CardTitle>Coming up</CardTitle>
              <CardDescription>Your next appointments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {next.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nothing scheduled yet.</p>
              ) : (
                next.map((appointment, index) => (
                  <Link
                    key={appointment.id}
                    href={`/appointments/${appointment.id}`}
                    style={accentVars(index)}
                    className="tile-row flex items-center gap-3 rounded-md p-2"
                  >
                    <div className="w-24 shrink-0">
                      <p className="whitespace-nowrap text-xs font-medium text-ink">
                        {formatDateShort(appointment.appointment_date)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatTime(appointment.appointment_time)}
                      </p>
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-ink">{appointment.patient_name}</p>
                    <StatusBadge status={appointment.status} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
