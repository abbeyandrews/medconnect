import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CSSProperties } from 'react';
import type { AppointmentStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Status colours. Deliberately not a rainbow: live states share the brand
 * green, states needing attention are amber, and closed-negative states are
 * red — so a scan down a column reads as "fine / look at me / gone".
 */
export function statusClasses(status: AppointmentStatus) {
  switch (status) {
    case 'pending':
      return 'bg-signal/15 text-amber-800 border-signal/40';
    case 'confirmed':
      return 'bg-primary/10 text-primary border-primary/25';
    case 'checked_in':
      return 'bg-tech/12 text-tech border-tech/30';
    case 'completed':
      return 'bg-secondary text-secondary-foreground border-border';
    case 'cancelled':
      return 'bg-destructive/10 text-destructive border-destructive/25';
    case 'no_show':
      return 'bg-destructive/5 text-destructive/80 border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function channelClasses(channel: string) {
  return channel === 'ussd'
    ? 'bg-tech/10 text-tech border-tech/25'
    : 'bg-secondary text-secondary-foreground border-border';
}

/** Which statuses a role may move an appointment to — mirrors the API. */
export function allowedStatuses(role: string, current: AppointmentStatus): AppointmentStatus[] {
  const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    pending: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
    confirmed: ['checked_in', 'completed', 'cancelled', 'no_show'],
    checked_in: ['completed', 'cancelled', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  const byRole: Record<string, AppointmentStatus[]> = {
    admin: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    receptionist: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
    doctor: ['confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
  };

  const allowedByRole = byRole[role] || [];
  return (transitions[current] || []).filter((status) => allowedByRole.includes(status));
}

/** Turns any thrown value into a message safe to show in a toast. */
export function errorMessage(err: unknown, fallback = 'Something went wrong.') {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

/**
 * Dashboard board accents.
 *
 * Boards are colour-coded rather than uniform so a row of cards reads as
 * several distinct things at a glance. `accentVars(n)` sets the `--tile`
 * custom property the `.tile` / `.tile-row` classes in globals.css tint with,
 * cycling through the six accents so any number of boards stays covered.
 */
export const TILE_ACCENTS = 6;

export function accentVars(index: number) {
  const slot = (((index % TILE_ACCENTS) + TILE_ACCENTS) % TILE_ACCENTS) + 1;
  return { '--tile': `var(--tile-${slot})` } as CSSProperties;
}
