'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Download, Search, Smartphone, UserPlus, Users, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DataState, EmptyState, PageHeader, Pagination } from '@/components/shared';
import { PatientFormDialog } from '@/components/patient-form-dialog';
import { qs } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { downloadFile } from '@/lib/download';
import { calculateAge, formatDateShort, formatPhone, todayStr } from '@/lib/format';
import { errorMessage } from '@/lib/utils';
import type { Paginated, Patient } from '@/lib/types';

export default function PatientsPage() {
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const debouncedQuery = useDebounced(query);
  useEffect(() => setPage(1), [debouncedQuery, source, status]);

  const { data, error, loading, reload } = useApi<Paginated<Patient, 'patients'>>(
    `/patients${qs({ query: debouncedQuery, source, status, page, pageSize: 25 })}`
  );

  const canManage = user?.role === 'admin' || user?.role === 'receptionist';
  const hasFilters = Boolean(query || source !== 'all' || status !== 'all');

  async function exportCsv() {
    try {
      await downloadFile('/reports/patients.csv', `patients-${todayStr()}.csv`);
      toast.success('CSV downloaded.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Patients"
        description="Everyone the hospital can reach. Records are created at this desk, or by a patient dialling in for the first time."
      >
        {canManage && (
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <UserPlus className="h-4 w-4" /> Register patient
            </Button>
          </>
        )}
      </PageHeader>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, patient ID or national ID…"
              className="pl-9"
            />
          </div>

          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[175px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any registration</SelectItem>
              <SelectItem value="ussd">Self-registered (USSD)</SelectItem>
              <SelectItem value="staff">Registered at the desk</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('');
                setSource('all');
                setStatus('all');
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </CardContent>

        <CardContent className="p-0">
          <DataState
            loading={loading}
            error={error}
            data={data}
            onRetry={reload}
            skeleton={<TableSkeleton rows={8} columns={6} />}
            isEmpty={(result) => result.patients.length === 0}
            empty={
              <EmptyState
                icon={Users}
                title={hasFilters ? 'No patients match' : 'No patients registered yet'}
                description={
                  hasFilters
                    ? 'Try a different search or clear the filters.'
                    : 'Register one here, or let the first USSD caller create their own record.'
                }
                action={
                  canManage && !hasFilters ? (
                    <Button onClick={() => setFormOpen(true)}>
                      <UserPlus className="h-4 w-4" /> Register a patient
                    </Button>
                  ) : undefined
                }
              />
            }
          >
            {(result) => (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="hidden md:table-cell">Age</TableHead>
                        <TableHead className="hidden lg:table-cell">Registered</TableHead>
                        <TableHead className="text-right">Appointments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.patients.map((patient) => (
                        <TableRow key={patient.id} className="row-hover">
                          <TableCell>
                            <Link
                              href={`/patients/${patient.id}`}
                              className="font-mono text-xs font-medium text-primary hover:underline"
                            >
                              {patient.patient_code}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/patients/${patient.id}`} className="font-medium text-ink hover:underline">
                              {patient.full_name}
                            </Link>
                            {!patient.is_active && (
                              <Badge variant="outline" className="ml-2 border-destructive/25 text-destructive">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{formatPhone(patient.phone)}</TableCell>
                          <TableCell className="hidden text-sm md:table-cell">
                            {calculateAge(patient.date_of_birth) ?? '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1.5">
                              {patient.source === 'ussd' ? (
                                <>
                                  <Smartphone className="h-3.5 w-3.5 text-tech" />
                                  <span className="text-xs text-tech">Self, via USSD</span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {patient.registered_by_name || 'Front desk'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{formatDateShort(patient.created_at?.slice(0, 10))}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium tabular-nums text-ink">{patient.appointment_count ?? 0}</span>
                            {Number(patient.upcoming_count) > 0 && (
                              <span className="ml-1.5 text-xs text-primary">({patient.upcoming_count} upcoming)</span>
                            )}
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

      <PatientFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />
    </>
  );
}
