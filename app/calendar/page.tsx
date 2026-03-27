'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, CalendarDays } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { FinancialEvent, EventType } from '@/lib/types';

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
};

const DOT_MAP: Record<string, string> = {
  blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500',
  emerald: 'bg-emerald-500', sky: 'bg-sky-500', indigo: 'bg-indigo-500',
  red: 'bg-red-500', zinc: 'bg-zinc-500',
};

const TYPE_LABELS: Record<EventType, string> = {
  deadline: 'Deadline', meeting: 'Meeting', review: 'Review', report: 'Report', close: 'Close',
};

// Calculate the Nth business day of a given month/year
function getNthBusinessDay(year: number, month: number, n: number): Date {
  const result = new Date(year, month, 1);
  let count = 0;
  while (count < n) {
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) count++;
    if (count < n) result.setDate(result.getDate() + 1);
  }
  return result;
}

function formatBDDate(bdDay: number): string {
  const now = new Date();
  const d = getNthBusinessDay(now.getFullYear(), now.getMonth(), bdDay);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysUntil(bdDay: number): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = getNthBusinessDay(now.getFullYear(), now.getMonth(), bdDay);
  const diff = Math.round((target.getTime() - now.getTime()) / 86400000);
  // If in past this month, check next month
  if (diff < -1) {
    const nextTarget = getNthBusinessDay(now.getFullYear(), now.getMonth() + 1, bdDay);
    return Math.round((nextTarget.getTime() - now.getTime()) / 86400000);
  }
  return diff;
}

const EMPTY_FORM = { title: '', event_type: 'deadline' as EventType, bd_day: '', specific_date: '', recurring: 'monthly', notes: '', color: 'zinc' };

export default function CalendarPage() {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<FinancialEvent | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/financial-calendar');
    setEvents(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditEvent(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(e: FinancialEvent) {
    setEditEvent(e);
    setForm({
      title: e.title,
      event_type: e.event_type,
      bd_day: e.bd_day?.toString() || '',
      specific_date: e.specific_date || '',
      recurring: e.recurring,
      notes: e.notes,
      color: e.color,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.title) return;
    const body = { ...form, bd_day: form.bd_day ? Number(form.bd_day) : null, specific_date: form.specific_date || null };
    if (editEvent) {
      await fetch('/api/financial-calendar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editEvent.id }) });
    } else {
      await fetch('/api/financial-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteEvent(id: number) {
    await fetch('/api/financial-calendar', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  // Sort by BD day, then specific date
  const sorted = [...events].sort((a, b) => {
    const aDay = a.bd_day ?? 999;
    const bDay = b.bd_day ?? 999;
    return aDay - bDay;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Financial Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Recurring close dates and key deadlines</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button onClick={openAdd}><Plus size={14} /> Add Event</Button>
        </div>
      </div>

      {/* Current month header */}
      <div className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">This Month</p>
        <p className="text-xl font-bold">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <p className="text-sm opacity-70 mt-0.5">Dates shown are calculated from business days</p>
      </div>

      {sorted.length === 0 && !loading ? (
        <EmptyState icon={CalendarDays} title="No events yet" description="Your close calendar is empty." action={<Button onClick={openAdd}><Plus size={14} /> Add first event</Button>} />
      ) : (
        <div className="space-y-2">
          {sorted.map(e => {
            const daysUntil = e.bd_day ? getDaysUntil(e.bd_day) : null;
            const dateStr = e.bd_day ? formatBDDate(e.bd_day) : e.specific_date || '';
            const isUrgent = daysUntil !== null && daysUntil >= 0 && daysUntil <= 2;
            const isPast = daysUntil !== null && daysUntil < 0;

            return (
              <Card key={e.id} hoverable onClick={() => openEdit(e)}>
                <CardBody className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', DOT_MAP[e.color] || DOT_MAP.zinc)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{e.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', COLOR_MAP[e.color] || COLOR_MAP.zinc)}>
                              {TYPE_LABELS[e.event_type]}
                            </span>
                            {e.bd_day && <span className="text-xs text-zinc-500">BD{e.bd_day}</span>}
                            <span className="text-xs text-zinc-500">{dateStr}</span>
                            {e.recurring !== 'once' && <span className="text-xs text-zinc-400 capitalize">{e.recurring}</span>}
                          </div>
                          {e.notes && <p className="text-xs text-zinc-400 mt-0.5">{e.notes}</p>}
                        </div>
                        {daysUntil !== null && (
                          <span className={cn(
                            'shrink-0 text-xs font-semibold px-2 py-1 rounded-lg',
                            isPast ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800' :
                            isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            daysUntil <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          )}>
                            {isPast ? 'Passed' : daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editEvent ? 'Edit Event' : 'Add Calendar Event'}>
        <div className="space-y-4">
          <Input label="Event title *" placeholder="e.g. Flash financial report distributed" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))}>
              <option value="deadline">Deadline</option>
              <option value="report">Report</option>
              <option value="review">Review</option>
              <option value="meeting">Meeting</option>
              <option value="close">Close</option>
            </Select>
            <Select label="Recurring" value={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="once">One-time</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Business Day (e.g. 5 = BD5)" type="number" min={1} max={23} placeholder="5" value={form.bd_day} onChange={e => setForm(f => ({ ...f, bd_day: e.target.value }))} />
            <Select label="Color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}>
              {Object.keys(COLOR_MAP).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </Select>
          </div>
          <Textarea label="Notes" placeholder="Any additional context" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.title} className="flex-1">{editEvent ? 'Save' : 'Add Event'}</Button>
            {editEvent && <Button variant="danger" onClick={async () => { await deleteEvent(editEvent.id); setModalOpen(false); }}><Trash2 size={14} /></Button>}
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
