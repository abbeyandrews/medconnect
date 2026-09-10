'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CheckCircle2, PhoneCall, Radio, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DataState, EmptyState, PageHeader, StatCard } from '@/components/shared';
import { UssdSimulator } from '@/components/ussd-simulator';
import { useApi } from '@/lib/use-api';
import { formatDateTime, formatPhone, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { UssdLogEntry, UssdSession } from '@/lib/types';

type UssdStats = {
  days: number;
  sessions: number;
  completed: number;
  errored: number;
  avgSteps: number;
  bookings: number;
  byHour: { hour: number; sessions: number }[];
};

/**
 * The USSD channel, as staff see it: a live test console, plus the log of what
 * real callers actually did — which is the only way to answer "the menu did
 * not work for me" without a packet capture.
 */
export default function UssdPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: stats } = useApi<UssdStats>(`/ussd/stats?days=7&r=${refreshKey}`);
  const { data: sessionData, loading, error, reload } = useApi<{ sessions: UssdSession[] }>(
    `/ussd/sessions?limit=40&r=${refreshKey}`
  );

  const completionRate = stats && stats.sessions > 0 ? Math.round((stats.completed / stats.sessions) * 100) : 0;

  return (
    <>
      <PageHeader
        title="USSD channel"
        description="The patient-facing side of the system. Patients dial the short code from any phone — this is where you test it and see what they did."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions (7 days)" value={stats?.sessions ?? '—'} icon={PhoneCall} accent={1} />
        <StatCard
          label="Reached a result"
          value={stats ? `${completionRate}%` : '—'}
          hint={stats ? `${stats.completed} of ${stats.sessions}` : undefined}
          icon={CheckCircle2}
          accent={5}
        />
        <StatCard label="Bookings via USSD" value={stats?.bookings ?? '—'} hint="Last 7 days" icon={Activity} accent={0} />
        <StatCard
          label="Errored sessions"
          value={stats?.errored ?? '—'}
          icon={TriangleAlert}
          tone={stats && stats.errored > 0 ? 'danger' : 'default'}
        />
      </div>

      <Tabs defaultValue="console">
        <TabsList>
          <TabsTrigger value="console">Test console</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="gateway">Gateway</TabsTrigger>
        </TabsList>

        <TabsContent value="console">
          <Card>
            <CardHeader>
              <CardTitle>Dial the service</CardTitle>
              <CardDescription>
                A working handset wired to the live endpoint. Everything you do here is real.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UssdSimulator onSessionEnd={() => setRefreshKey((key) => key + 1)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>Every dial-in, newest first. Open one to replay it screen by screen.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataState
                loading={loading}
                error={error}
                data={sessionData}
                onRetry={reload}
                skeleton={<TableSkeleton rows={6} columns={5} />}
                isEmpty={(result) => result.sessions.length === 0}
                empty={
                  <EmptyState
                    icon={Radio}
                    title="No USSD sessions yet"
                    description="Dial from the test console, or wait for a patient to call in."
                  />
                }
              >
                {(result) => (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Caller</TableHead>
                          <TableHead className="hidden md:table-cell">Patient</TableHead>
                          <TableHead>Last screen</TableHead>
                          <TableHead className="hidden sm:table-cell">Screens</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead className="text-right">When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.sessions.map((session) => (
                          <SessionRow key={session.id} session={session} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </DataState>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic">
          <Card>
            <CardHeader>
              <CardTitle>When patients dial</CardTitle>
              <CardDescription>
                Sessions by hour of day over the last 7 days — useful for staffing the desk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!stats || stats.byHour.length === 0 ? (
                <EmptyState title="Not enough traffic yet" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={Array.from({ length: 24 }, (_, hour) => ({
                      hour: `${String(hour).padStart(2, '0')}:00`,
                      sessions: stats.byHour.find((h) => Number(h.hour) === hour)?.sessions ?? 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE8E2" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6B7F79' }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7F79' }} axisLine={false} tickLine={false} width={26} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DCE8E2', fontSize: 12 }} cursor={{ fill: '#EFF6F2' }} />
                    <Bar dataKey="sessions" name="Sessions" fill="#2D81BE" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {stats && (
                <p className="mt-4 text-sm text-muted-foreground">
                  A session takes <span className="font-medium text-ink">{stats.avgSteps.toFixed(1)}</span> screens on
                  average.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gateway">
          <GatewayGuide />
        </TabsContent>
      </Tabs>
    </>
  );
}

function SessionRow({ session }: { session: UssdSession }) {
  const [open, setOpen] = useState(false);
  const { data } = useApi<{ entries: UssdLogEntry[] }>(open ? `/ussd/sessions/${session.session_id}` : null);

  const outcome = session.end_reason || (session.ended ? 'ended' : 'active');

  return (
    <>
      <TableRow className="row-hover cursor-pointer" onClick={() => setOpen((value) => !value)}>
        <TableCell className="font-mono text-xs">{formatPhone(session.msisdn)}</TableCell>
        <TableCell className="hidden md:table-cell">
          {session.patient_id ? (
            <Link
              href={`/patients/${session.patient_id}`}
              onClick={(event) => event.stopPropagation()}
              className="text-sm text-primary hover:underline"
            >
              {session.patient_name}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Not recognised</span>
          )}
        </TableCell>
        <TableCell>
          <code className="text-xs text-muted-foreground">{session.stage}</code>
        </TableCell>
        <TableCell className="hidden tabular-nums sm:table-cell">{session.step_count}</TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] capitalize',
              outcome === 'completed' && 'border-primary/25 bg-primary/10 text-primary',
              outcome === 'error' && 'border-destructive/25 bg-destructive/10 text-destructive',
              outcome === 'active' && 'border-tech/25 bg-tech/10 text-tech'
            )}
          >
            {outcome}
          </Badge>
        </TableCell>
        <TableCell className="text-right text-xs text-muted-foreground">
          {formatRelative(session.created_at)}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow>
          <TableCell colSpan={6} className="bg-secondary/30 p-4">
            {!data ? (
              <p className="text-sm text-muted-foreground">Loading the session…</p>
            ) : data.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing was logged for this session.</p>
            ) : (
              <ol className="space-y-2">
                {data.entries.map((entry) => (
                  <li key={entry.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        <code className="text-tech">{entry.user_input || '(no input)'}</code>
                        {' → '}
                        <code>{entry.stage_out}</code>
                      </span>
                      <span>
                        {formatDateTime(entry.created_at)}
                        {entry.duration_ms !== null ? ` · ${entry.duration_ms}ms` : ''}
                      </span>
                    </div>
                    <pre className="ussd-screen mt-2 whitespace-pre-wrap text-xs text-ink">{entry.response}</pre>
                  </li>
                ))}
              </ol>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function GatewayGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connecting a real short code</CardTitle>
        <CardDescription>
          The endpoint already speaks the standard aggregator contract, so going live needs no code changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert variant="info" title="One callback URL is all a gateway needs">
          Register your short code with an aggregator (Africa&apos;s Talking, Hubtel, Nsano, Nalo) and point their
          callback at <code className="font-mono text-ink">https://your-domain.com/api/ussd</code>.
        </Alert>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">What the gateway sends</p>
          <pre className="overflow-x-auto rounded-md border border-border bg-secondary/40 p-3 font-mono text-xs text-ink">
{`POST /api/ussd
Content-Type: application/json

{
  "sessionId":   "ATUid_a1b2c3",
  "serviceCode": "*920*131#",
  "phoneNumber": "+233551234567",
  "text":        "1*2*3"
}`}
          </pre>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">What this server replies</p>
          <pre className="overflow-x-auto rounded-md border border-border bg-secondary/40 p-3 font-mono text-xs text-ink">
{`CON Select a department:
1. General Medicine
2. Pediatrics
0. Back

— or, to end the session —

END Appointment booked.
Ref: MC-8F3K2A`}
          </pre>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-ink">CON</span> keeps the session open and shows the screen.{' '}
            <span className="font-medium text-ink">END</span> shows it and hangs up.
          </li>
          <li>
            <span className="font-medium text-ink">text</span> is every key pressed so far, joined by{' '}
            <code className="font-mono">*</code>. Only the last segment is read here — conversation state lives in the
            database — so aggregators that send just the latest input work unchanged.
          </li>
          <li>
            Phone numbers arrive in several formats and are all normalised to one canonical number, so a patient never
            ends up with duplicate records.
          </li>
          <li>
            Screens are kept under the network&apos;s character limit and long lists page with{' '}
            <code className="font-mono">99</code>; <code className="font-mono">0</code> goes back.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
