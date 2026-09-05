'use client';

import Link from 'next/link';
import {
  Building2,
  Database,
  MailCheck,
  MailX,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataState, Field, PageHeader, StatCard } from '@/components/shared';
import { useApi } from '@/lib/use-api';
import { formatRelative } from '@/lib/format';
import type { AuditEntry } from '@/lib/types';

type SystemInfo = {
  app: { environment: string; node: string; uptimeSeconds: number; host: string; platform: string };
  database: { version: string; name: string; host: string; port: number; tables: { name: string; approx_rows: number }[] };
  counts: { patients: number; appointments: number; doctors: number; users: number; ussd_sessions: number };
  notifications: {
    enabled: boolean;
    sms: { configured: boolean; provider: string; mode: string };
    email: { configured: boolean; provider: string };
  };
};

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

const SHORTCUTS = [
  {
    href: '/admin/users',
    icon: Users,
    title: 'Staff accounts',
    description: 'Create logins, issue and reset passwords, deactivate people who have left.',
  },
  {
    href: '/admin/departments',
    icon: Building2,
    title: 'Departments',
    description: 'What appears on the USSD menu, and in what order.',
  },
  {
    href: '/admin/settings',
    icon: Settings,
    title: 'System settings',
    description: 'Short code, booking window, reminders and notification providers.',
  },
  {
    href: '/admin/audit',
    icon: ScrollText,
    title: 'Audit log',
    description: 'Every action staff have taken, with who and when.',
  },
];

export default function AdminOverviewPage() {
  const { data, error, loading, reload } = useApi<SystemInfo>('/admin/system');
  const { data: auditData } = useApi<{ entries: AuditEntry[] }>('/admin/audit?pageSize=8');

  return (
    <>
      <PageHeader
        title="Administration"
        description="Accounts, configuration and the health of the system."
      />

      <DataState loading={loading} error={error} data={data} onRetry={reload}>
        {(info) => (
          <div className="space-y-6">
            {!info.notifications.sms.configured && (
              <Alert variant="info" title="Notifications are in development mode">
                No SMS or email credentials are configured, so confirmations and reminders are written to the message
                log instead of being delivered. Everything else works normally. Add provider credentials to{' '}
                <code className="font-mono text-ink">backend/.env</code> to switch on real delivery.
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Staff accounts" value={info.counts.users} icon={ShieldCheck} href="/admin/users" accent={0} />
              <StatCard label="Patients" value={info.counts.patients} icon={Users} href="/patients" accent={1} />
              <StatCard label="Appointments" value={info.counts.appointments} icon={Database} href="/appointments" accent={3} />
              <StatCard label="USSD sessions" value={info.counts.ussd_sessions} icon={Server} href="/ussd" accent={5} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {SHORTCUTS.map((shortcut) => (
                <Link key={shortcut.href} href={shortcut.href}>
                  <Card className="h-full transition-shadow hover:shadow-panel">
                    <CardContent className="flex gap-4 pt-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                        <shortcut.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{shortcut.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{shortcut.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System</CardTitle>
                  <CardDescription>Where this instance is running</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Environment">
                      <Badge
                        variant="outline"
                        className={
                          info.app.environment === 'production'
                            ? 'border-primary/25 bg-primary/10 text-primary'
                            : 'border-signal/40 bg-signal/10 text-amber-800'
                        }
                      >
                        {info.app.environment}
                      </Badge>
                    </Field>
                    <Field label="Uptime">{formatUptime(info.app.uptimeSeconds)}</Field>
                    <Field label="Node">{info.app.node}</Field>
                    <Field label="Host">{info.app.host}</Field>
                    <Field label="Database">
                      {info.database.name}
                      <span className="block text-xs text-muted-foreground">
                        {info.database.version} at {info.database.host}:{info.database.port}
                      </span>
                    </Field>
                    <Field label="Tables">{info.database.tables.length}</Field>
                    <Field label="SMS">
                      <span className="flex items-center gap-1.5">
                        {info.notifications.sms.configured ? (
                          <>
                            <MailCheck className="h-3.5 w-3.5 text-primary" /> {info.notifications.sms.provider} (
                            {info.notifications.sms.mode})
                          </>
                        ) : (
                          <>
                            <MailX className="h-3.5 w-3.5 text-muted-foreground" /> Not configured
                          </>
                        )}
                      </span>
                    </Field>
                    <Field label="Email">
                      <span className="flex items-center gap-1.5">
                        {info.notifications.email.configured ? (
                          <>
                            <MailCheck className="h-3.5 w-3.5 text-primary" /> {info.notifications.email.provider}
                          </>
                        ) : (
                          <>
                            <MailX className="h-3.5 w-3.5 text-muted-foreground" /> Not configured
                          </>
                        )}
                      </span>
                    </Field>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">Latest activity</CardTitle>
                    <CardDescription>What staff have just done</CardDescription>
                  </div>
                  <Link href="/admin/audit" className="text-sm text-primary hover:underline">
                    Full log
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Who</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="text-right">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditData?.entries ?? []).map((entry) => (
                        <TableRow key={entry.id} className="row-hover">
                          <TableCell className="text-sm">{entry.user_label || 'System'}</TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground">{entry.action}</code>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatRelative(entry.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}
