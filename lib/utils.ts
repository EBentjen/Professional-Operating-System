import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfWeek, endOfWeek, addDays, parseISO, isToday, isPast, differenceInDays } from 'date-fns';
import type { PriorityStatus, ImpactLevel } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function getCurrentWeekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
}

export function getCurrentWeekEnd(): Date {
  return endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday
}

export function getWeekStartISO(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getWeekEndISO(date: Date = new Date()): string {
  return format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

export function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatWeekRange(start: string, end: string): string {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    if (format(s, 'MMM') === format(e, 'MMM')) {
      return `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`;
    }
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export function daysUntilDue(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return null;
  }
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function isDueSoon(dateStr: string | null, days = 3): boolean {
  const d = daysUntilDue(dateStr);
  return d !== null && d >= 0 && d <= days;
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<PriorityStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
};

export const STATUS_COLORS: Record<PriorityStatus, string> = {
  not_started: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  blocked: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

export const STATUS_DOT: Record<PriorityStatus, string> = {
  not_started: 'bg-zinc-400',
  in_progress: 'bg-blue-500',
  blocked: 'bg-red-500',
  done: 'bg-emerald-500',
};

export const IMPACT_COLORS: Record<ImpactLevel, string> = {
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  low: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  high: 'High Impact',
  medium: 'Medium',
  low: 'Low',
};
