'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, FileText, Mail, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataState, EmptyState, PageHeader, StatCard } from '@/components/shared';
import { qs } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { downloadFile } from '@/lib/download';
import { addDays, formatDateShort, formatRelative, todayStr } from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import type { NotificationLog, ReportSummary } from '@/lib/types';

/**
 * The reporting screen. The headline number is the USSD share: the proportion
 * of appointments that arrived from patients who needed no smartphone and no
 * internet, which is the case this system exists to make.
 */
export default function ReportsPage() {
  const [from, setFrom] = useState(addDays(todayStr(), -30));
  const [to, setTo] = useState(todayStr());

  const { data, error, loading, reload } = useApi<ReportSummary>(`/reports/summary${qs({ from, to })}`);
  const { data: messageData } = useApi<{ messages: NotificationLog[] }>('/reports/messages?limit=60');

  async function download(kind: 'appointments.csv' | 'appointments.pdf' | 'patients.csv') {
    try {
      const path = kind.startsWith('patients') ? `/reports/${kind}` : `/reports/${kind}${qs({ from, to })}`;
      await downloadFile(path, `${kind.replace('.', `-${todayStr()}.`)}`);
      toast.success('Download started.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title="Reports" description="How the appointment book is performing, and which channel is carrying it.">
        <Button variant="outline" size="sm" onClick={() => download('appointments.csv')}>
          <Download className="h-4 w-4" /> Appointments CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => download('appointments.pdf')}>
          <FileText className="h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => download('patients.csv')}>
          <Download className="h-4 w-4" /> Patients CSV
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input id="from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="w-auto" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input id="to" type="date" value={to} min={from} max={todayStr()} onChange={(event) => setTo(event.target.value)} className="w-auto" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Last 7 days', days: 7 },
              { label: 'Last 30 days', days: 30 },
              { label: 'Last 90 days', days: 90 },
            ].map((preset) => (
              <Button
                key={preset.days}
                variant="outline"
                size="sm"
                onClick={() => {
                  setFrom(addDays(todayStr(), -preset.days));
                  setTo(todayStr());
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <DataState loading={loading} error={error} data={data} onRetry={reload}>
        {(report) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Appointments" value={report.totals.total} hint={`${report.range.from} → ${report.range.to}`} accent={0} />
              <StatCard
                label="Booked over USSD"
                value={`${report.totals.ussdShare}%`}
                hint={`${report.totals.viaUssd} of ${report.totals.total}`}
                accent={1}
              />
              <StatCard
                label="Attendance"
                value={`${report.totals.attendanceRate}%`}
                hint={`${report.totals.completed} completed`}
                accent={5}
              />
              <StatCard
                label="No-shows"
                value={`${report.totals.noShowRate}%`}
                hint={`${report.totals.noShow} missed`}
                accent={4}
                tone={report.totals.noShowRate > 15 ? 'danger' : 'default'}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Bookings per day, by channel</CardTitle>
                <CardDescription>
                  {report.totals.viaUssd > report.totals.viaWeb
                    ? 'Most appointments in this period came in over USSD.'
                    : 'Most appointments in this period were booked at the desk.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.daily.length === 0 ? (
                  <EmptyState title="No appointments in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={report.daily.map((d) => ({ ...d, label: formatDateShort(d.date).slice(0, 10) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DCE8E2" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7F79' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7F79' }} axisLine={false} tickLine={false} width={26} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DCE8E2', fontSize: 12 }} cursor={{ fill: '#EFF6F2' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="ussd" name="USSD" stackId="a" fill="#2D81BE" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="web" name="Front desk" stackId="a" fill="#319B74" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="departments">
              <TabsList>
                <TabsTrigger value="departments">By department</TabsTrigger>
                <TabsTrigger value="doctors">By doctor</TabsTrigger>
                <TabsTrigger value="messages">Message log</TabsTrigger>
              </TabsList>

              <TabsContent value="departments">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Via USSD</TableHead>
                          <TableHead className="text-right">Completed</TableHead>
                          <TableHead className="text-right">No-shows</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byDepartment.map((row) => (
                          <TableRow key={row.name} className="row-hover">
                            <TableCell className="font-medium text-ink">{row.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                            <TableCell className="text-right tabular-nums text-tech">
                              {row.via_ussd}
                              {Number(row.total) > 0 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({Math.round((Number(row.via_ussd) / Number(row.total)) * 100)}%)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.no_show}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="doctors">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Doctor</TableHead>
                          <TableHead className="hidden sm:table-cell">Department</TableHead>
                          <TableHead className="text-right">Booked</TableHead>
                          <TableHead className="text-right">Seen</TableHead>
                          <TableHead className="text-right">No-shows</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byDoctor.map((row) => (
                          <TableRow key={row.doctor} className="row-hover">
                            <TableCell className="font-medium text-ink">Dr. {row.doctor.replace(/^Dr\.?\s*/i, '')}</TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                              {row.department}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.no_show}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">SMS and email delivery</CardTitle>
                    <CardDescription>
                      {report.messages.sent} sent, {report.messages.failed} failed, {report.messages.skipped} skipped in
                      this range.{' '}
                      {report.messages.skipped > 0 &&
                        'Skipped means no provider credentials are configured — the message was logged, not sent.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(messageData?.messages?.length ?? 0) === 0 ? (
                      <EmptyState icon={MessageSquare} title="No messages logged" />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>To</TableHead>
                              <TableHead className="hidden md:table-cell">Event</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden lg:table-cell">Message</TableHead>
                              <TableHead className="text-right">When</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {messageData!.messages.map((message) => (
                              <TableRow key={message.id} className="row-hover">
                                <TableCell>
                                  <span className="flex items-center gap-1.5 text-sm">
                                    {message.channel === 'sms' ? (
                                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    {message.recipient}
                                  </span>
                                  {message.patient_name && (
                                    <p className="text-xs text-muted-foreground">{message.patient_name}</p>
                                  )}
                                </TableCell>
                                <TableCell className="hidden text-xs capitalize md:table-cell">
                                  {message.event.replace(/_/g, ' ')}
                                </TableCell>
                                <TableCell>
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
                                </TableCell>
                                <TableCell className="hidden max-w-[320px] truncate text-xs text-muted-foreground lg:table-cell">
                                  {message.message}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {formatRelative(message.created_at)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DataState>
    </>
  );
}
