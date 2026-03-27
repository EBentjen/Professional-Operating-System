'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseISO(val: string): Date | null {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(val: string): string {
  const d = parseISO(val);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  clearable?: boolean;
}

export function DatePicker({ value, onChange, label, placeholder = 'Pick a date', className, clearable = true }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const selected = parseISO(value);
  const [view, setView] = useState(() => {
    const base = selected ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  // Sync view when value changes externally
  useEffect(() => {
    if (selected) setView({ year: selected.getFullYear(), month: selected.getMonth() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function prevMonth() {
    setView(v => {
      const m = v.month === 0 ? 11 : v.month - 1;
      const y = v.month === 0 ? v.year - 1 : v.year;
      return { year: y, month: m };
    });
  }

  function nextMonth() {
    setView(v => {
      const m = v.month === 11 ? 0 : v.month + 1;
      const y = v.month === 11 ? v.year + 1 : v.year;
      return { year: y, month: m };
    });
  }

  function selectDay(day: number) {
    const d = new Date(view.year, view.month, day);
    onChange(toISO(d));
    setOpen(false);
  }

  // Build calendar grid
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (day: number) =>
    selected?.getFullYear() === view.year &&
    selected?.getMonth() === view.month &&
    selected?.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === view.year &&
    today.getMonth() === view.month &&
    today.getDate() === day;

  return (
    <div className={cn('space-y-1.5', className)} ref={ref}>
      {label && (
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100',
            value ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
          )}
        >
          <Calendar size={14} className="shrink-0 text-zinc-400" />
          <span className="flex-1">{value ? formatDisplay(value) : placeholder}</span>
          {clearable && value && (
            <span
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(''); } }}
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-base leading-none"
              aria-label="Clear date"
            >
              ×
            </span>
          )}
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {MONTHS[view.month]} {view.year}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => (
                <div key={i} className="flex items-center justify-center">
                  {day ? (
                    <button
                      type="button"
                      onClick={() => selectDay(day)}
                      className={cn(
                        'w-8 h-8 rounded-full text-sm transition-colors',
                        isSelected(day)
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                          : isToday(day)
                          ? 'border border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      )}
                    >
                      {day}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Today shortcut */}
            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
              <button
                type="button"
                onClick={() => { onChange(toISO(today)); setOpen(false); }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
