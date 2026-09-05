'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarPlus, Download, FileText, Search, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  ChannelBadge,
  DataState,
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
} from '@/components/shared';
import { BookAppointmentDialog } from '@/components/book-appointment-dialog';
import { StatusActions } from '@/components/status-actions';
import { qs } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { downloadFile } from '@/lib/download';
import { doctorName, formatDateShort, formatPhone, formatTime, todayStr } from '@/lib/format';
import { errorMessage } from '@/lib/utils';
import type { Appointment, Paginated } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No show' },
];

export default function AppointmentsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [bookingOpen, setBookingOpen] = useState(false);

  const debouncedQuery = useDebounced(query);

  // ?new=1 from the dashboard opens the booking dialog straight away.
  useEffect(() => {
    if (searchParams.get('new') === '1') setBookingOpen(true);
  }, [searchParams]);

  // Any filter change resets to the first page — otherwise a narrowed result
  // set can leave you stranded on an empty page 4.
  useEffect(() => setPage(1), [debouncedQuery, status, channel, date]);

  const path = `/appointments${qs({
    query: debouncedQuery,
    status,
    channel,
    date,
    page,
    pageSize: 25,
    sort: date ? 'date_asc' : 'date_desc',
  })}`;

  const { data, error, loading, reload } = useApi<Paginated<Appointment, 'appointments'>>(path);

  const canBook = user?.role === 'admin' || user?.role === 'receptionist';
  const canExport = canBook;
  const hasFilters = Boolean(query || date || status !== 'all' || channel !== 'all');

  function clearFilters() {
    setQuery('');
    setStatus('all');
    setChannel('all');
    setDate('');
  }

  async function exportFile(kind: 'csv' | 'pdf') {
    try {
      await downloadFile(
        `/reports/appointments.${kind}${qs({ status: status === 'all' ? '' : status, channel: channel === 'all' ? '' : channel, from: date, to: date })}`,
        `appointments-${todayStr()}.${kind}`
      );
      toast.success(`${kind.toUpperCase()} downloaded.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        description={
          user?.role === 'doctor'
            ? 'Every appointment booked with you, through either channel.'
            : 'Every appointment in the hospital, whether booked over USSD or at the desk.'
        }
      >
        {canExport && (
          <>
            <Button variant="outline" size="sm" onClick={() => exportFile('csv')}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportFile('pdf')}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </>
        )}
        {canBook && (
          <Button size="sm" onClick={() => setBookingOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> Book
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reference, patient, phone or doctor…"
              className="pl-9"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-[145px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Both channels</SelectItem>
              <SelectItem value="ussd">USSD only</SelectItem>
              <SelectItem value="web">Front desk only</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-[160px]"
            aria-label="Filter by date"
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
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
            isEmpty={(result) => result.appointments.length === 0}
            empty={
              <EmptyState
                title={hasFilters ? 'No appointments match those filters' : 'No appointments yet'}
                description={
                  hasFilters
                    ? 'Try widening the date range or clearing the filters.'
                    : 'Bookings will appear here the moment a patient dials in or the desk books one.'
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : canBook ? (
                    <Button onClick={() => setBookingOpen(true)}>
                      <CalendarPlus className="h-4 w-4" /> Book the first one
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
                        <TableHead>Reference</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead className="hidden lg:table-cell">Doctor</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Via</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.appointments.map((appointment) => (
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
                            <Link
                              href={`/patients/${appointment.patient_id}`}
                              className="font-medium text-ink hover:underline"
                            >
                              {appointment.patient_name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{formatPhone(appointment.patient_phone)}</p>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <p className="text-sm text-ink">{doctorName(appointment.doctor_name)}</p>
                            <p className="text-xs text-muted-foreground">{appointment.department_name}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-ink">{formatDateShort(appointment.appointment_date)}</p>
                            <p className="font-mono text-xs tabular-nums text-muted-foreground">
                              {formatTime(appointment.appointment_time)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={appointment.status} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <ChannelBadge channel={appointment.channel} />
                          </TableCell>
                          <TableCell className="text-right">
                            <StatusActions appointment={appointment} onChanged={reload} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Pagination
                  page={result.page}
                  pageSize={result.pageSize}
                  total={result.total}
                  onPageChange={setPage}
                />
              </>
            )}
          </DataState>
        </CardContent>
      </Card>

      <BookAppointmentDialog open={bookingOpen} onOpenChange={setBookingOpen} onBooked={reload} />
    </>
  );
}
