'use client';

import Link from 'next/link';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/skeleton';
import { STATUS_LABELS, CHANNEL_LABELS } from '@/lib/format';
import { cn, statusClasses, channelClasses, accentVars } from '@/lib/utils';
import type { AppointmentStatus, Channel } from '@/lib/types';

/** The heading block every screen opens with. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl text-ink md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('border font-medium', statusClasses(status), className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <Badge variant="outline" className={cn('border font-medium', channelClasses(channel))}>
      {CHANNEL_LABELS[channel] ?? channel}
    </Badge>
  );
}

/**
 * A single number with its label — the row across the top of most screens.
 *
 * `accent` picks one of the six board colours (see accentVars). Give each card
 * in a row a different index and the row reads as distinct boards rather than
 * one repeated shape; hovering lifts the card and floods it with its colour.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent = 0,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  accent?: number;
  /** Overrides the accent when the number itself means something is wrong. */
  tone?: 'default' | 'danger';
}) {
  const danger = tone === 'danger';

  const body = (
    <Card
      style={danger ? undefined : accentVars(accent)}
      className={cn('tile h-full', danger && '[--tile:var(--destructive)]')}
    >
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p
            className={cn(
              'tile-value mt-2 font-display text-3xl tabular-nums',
              danger ? 'text-destructive' : 'text-ink'
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className="tile-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </span>
      <p className="mt-4 font-medium text-ink">That did not load</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}

export function CenteredSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner className="h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/**
 * Renders the right thing for a `useApi` result: skeleton while loading, an
 * error with a retry, an empty state, or the content.
 */
export function DataState<T>({
  loading,
  error,
  data,
  isEmpty,
  onRetry,
  empty,
  skeleton,
  children,
}: {
  loading: boolean;
  error: { message: string } | null;
  data: T | null;
  isEmpty?: (data: T) => boolean;
  onRetry?: () => void;
  empty?: React.ReactNode;
  skeleton?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (loading && !data) return <>{skeleton ?? <TableSkeleton />}</>;
  if (error && !data) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (!data) return null;
  if (isEmpty?.(data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(data)}</>;
}

/** Label/value pair used across the record and detail screens. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{children || '—'}</dd>
    </div>
  );
}

/** Page-number controls for the server-paginated lists. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Showing <span className="tabular-nums text-ink">{first}</span>–
        <span className="tabular-nums text-ink">{last}</span> of{' '}
        <span className="tabular-nums text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {page} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
