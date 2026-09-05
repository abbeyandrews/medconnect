'use client';

import { useEffect, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DataState, EmptyState, PageHeader, Pagination } from '@/components/shared';
import { qs } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AuditEntry } from '@/lib/types';

/**
 * Who did what. Every write by a staff member is recorded, which is what makes
 * an internal system with shared patient data defensible.
 */

const ACTION_GROUPS = [
  { value: 'all', label: 'All activity' },
  { value: 'auth', label: 'Sign-ins' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'patient', label: 'Patients' },
  { value: 'doctor', label: 'Doctors' },
  { value: 'user', label: 'Staff accounts' },
  { value: 'department', label: 'Departments' },
  { value: 'settings', label: 'Settings' },
  { value: 'report', label: 'Report exports' },
];

/** Destructive or privileged actions are worth spotting at a glance. */
function toneFor(action: string) {
  if (/(delete|deactivate|cancel|no_show)/.test(action)) return 'border-destructive/25 bg-destructive/10 text-destructive';
  if (/(create|reactivate|reset_password|unlock)/.test(action)) return 'border-primary/25 bg-primary/10 text-primary';
  if (action.startsWith('auth.')) return 'border-border bg-secondary text-muted-foreground';
  return 'border-border bg-secondary text-secondary-foreground';
}

export default function AuditPage() {
  const [action, setAction] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [action, from, to]);

  const { data, error, loading, reload } = useApi<{
    entries: AuditEntry[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/admin/audit${qs({ action, from, to, page, pageSize: 50 })}`);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="A permanent record of every action staff take in this system, kept even if the account is later removed."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_GROUPS.map((group) => (
                <SelectItem key={group.value} value={group.value}>
                  {group.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-[150px]"
              aria-label="From date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-[150px]"
              aria-label="To date"
            />
          </div>
        </CardContent>

        <CardContent className="p-0">
          <DataState
            loading={loading}
            error={error}
            data={data}
            onRetry={reload}
            skeleton={<TableSkeleton rows={10} columns={4} />}
            isEmpty={(result) => result.entries.length === 0}
            empty={
              <EmptyState
                icon={ScrollText}
                title="No activity recorded"
                description="Nothing matches those filters."
              />
            }
          >
            {(result) => (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Who</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="hidden lg:table-cell">From</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.entries.map((entry) => (
                        <TableRow key={entry.id} className="row-hover">
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDateTime(entry.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-ink">{entry.user_label || 'System'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('font-mono text-[10px]', toneFor(entry.action))}>
                              {entry.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[360px] text-sm text-muted-foreground">
                            {entry.details || '—'}
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                            {entry.ip_address || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPageChange={setPage} />
              </>
            )}
          </DataState>
        </CardContent>
      </Card>
    </>
  );
}
