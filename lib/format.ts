import type { AppointmentStatus, Channel } from './types';

/** Parses 'YYYY-MM-DD' as local midnight — `new Date(str)` would read it as UTC. */
export function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayStr() {
  return toDateInput(new Date());
}

export function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

/** 'Mon 16 Mar 2026' */
export function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return parseDate(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** 'Mon 16 Mar' — for dense tables. */
export function formatDateShort(dateStr?: string | null) {
  if (!dateStr) return '—';
  return parseDate(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

/** 'Monday, 16 March 2026' */
export function formatDateLong(dateStr?: string | null) {
  if (!dateStr) return '—';
  return parseDate(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(timeStr?: string | null) {
  if (!timeStr) return '—';
  return timeStr.slice(0, 5);
}

/** A TIMESTAMP rendered for a log column. */
export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 'just now' / '4 min ago' / '3 days ago' */
export function formatRelative(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${seconds < 172800 ? '' : 's'} ago`;
  return formatDateTime(value);
}

/** '0551234567' -> '055 123 4567' */
export function formatPhone(phone?: string | null) {
  if (!phone) return '—';
  return phone.replace(/^(\d{3})(\d{3})(\d+)$/, '$1 $2 $3');
}

export function calculateAge(dob?: string | null) {
  if (!dob) return null;
  const birth = parseDate(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  ussd: 'USSD',
  web: 'Front desk',
};

export function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Strips a leading "Dr." so the UI can add exactly one. */
export function doctorName(name?: string | null) {
  if (!name) return '—';
  return `Dr. ${name.replace(/^Dr\.?\s*/i, '')}`;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Turns weekly bands into 'Mon–Fri 08:00–16:00' rather than five near-identical lines. */
export function summariseAvailability(bands?: { dayOfWeek: number; startTime: string; endTime: string }[]) {
  if (!bands || bands.length === 0) return 'No clinic hours set';

  const groups = new Map<string, number[]>();
  for (const band of bands) {
    const key = `${formatTime(band.startTime)}–${formatTime(band.endTime)}`;
    groups.set(key, [...(groups.get(key) || []), band.dayOfWeek]);
  }

  return Array.from(groups.entries())
    .map(([hours, days]) => {
      const sorted = [...new Set(days)].sort((a, b) => a - b);
      const isRun = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
      const label = isRun
        ? `${WEEKDAYS_SHORT[sorted[0]]}–${WEEKDAYS_SHORT[sorted[sorted.length - 1]]}`
        : sorted.map((d) => WEEKDAYS_SHORT[d]).join(', ');
      return `${label} ${hours}`;
    })
    .join(' · ');
}
