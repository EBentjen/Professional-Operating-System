'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Check, Trash2, RefreshCw, ClipboardList, AlertCircle, Clock, CalendarDays } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatDate } from '@/lib/utils';
import type { FollowUp, Stakeholder } from '@/lib/types';

function isOverdue(due_date: string | null): boolean {
  if (!due_date) return false;
  return new Date(due_date + 'T00:00:00') < new Date(new Date().toDateString());
}

function isDueThisWeek(due_date: string | null): boolean {
  if (!due_date) return false;
  const d = new Date(due_date + 'T00:00:00');
  const today = new Date(new Date().toDateString());
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  return d >= today && d <= weekEnd;
}

type GroupKey = 'overdue' | 'this_week' | 'later' | 'no_date' | 'done';

interface Group {
  key: GroupKey;
  label: string;
  icon: React.ReactNode;
  items: FollowUp[];
  accent: string;
}

function groupFollowUps(items: FollowUp[]): Group[] {
  const groups: Record<GroupKey, FollowUp[]> = {
    overdue: [], this_week: [], later: [], no_date: [], done: [],
  };

  for (const item of items) {
    if (item.is_complete) { groups.done.push(item); continue; }
    if (isOverdue(item.due_date)) { groups.overdue.push(item); continue; }
    if (isDueThisWeek(item.due_date)) { groups.this_week.push(item); continue; }
    if (item.due_date) { groups.later.push(item); continue; }
    groups.no_date.push(item);
  }

  return ([
    { key: 'overdue'   as GroupKey, label: 'Overdue',       icon: <AlertCircle size={13} />, items: groups.overdue,   accent: 'text-red-600 dark:text-red-400' },
    { key: 'this_week' as GroupKey, label: 'Due This Week',  icon: <Clock size={13} />,       items: groups.this_week, accent: 'text-amber-600 dark:text-amber-400' },
    { key: 'later'     as GroupKey, label: 'Coming Up',      icon: <CalendarDays size={13} />,items: groups.later,     accent: 'text-blue-600 dark:text-blue-400' },
    { key: 'no_date'   as GroupKey, label: 'No Date',        icon: <ClipboardList size={13} />,items: groups.no_date, accent: 'text-zinc-500' },
    { key: 'done'      as GroupKey, label: 'Completed',      icon: <Check size={13} />,       items: groups.done,      accent: 'text-emerald-600 dark:text-emerald-400' },
  ] as Group[]).filter(g => g.items.length > 0);
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStakeholder, setFilterStakeholder] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [addForm, setAddForm] = useState({ description: '', stakeholder_id: '', due_date: '' });
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [fuRes, sRes] = await Promise.all([
      fetch('/api/follow-ups'),
      fetch('/api/stakeholders'),
    ]);
    const fuData = await fuRes.json();
    const sData = await sRes.json();
    setFollowUps(fuData.data ?? []);
    setStakeholders(sData.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function complete(id: number, current: number) {
    await fetch('/api/follow-ups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_complete: !current }),
    });
    load();
  }

  async function remove(id: number) {
    await fetch(`/api/follow-ups?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function addFollowUp() {
    if (!addForm.description.trim()) return;
    setSaving(true);
    await fetch('/api/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: addForm.description.trim(),
        stakeholder_id: addForm.stakeholder_id ? Number(addForm.stakeholder_id) : null,
        due_date: addForm.due_date || null,
      }),
    });
    setAddForm({ description: '', stakeholder_id: '', due_date: '' });
    setAddOpen(false);
    setSaving(false);
    load();
  }

  const filtered = filterStakeholder
    ? followUps.filter(f => String(f.stakeholder_id) === filterStakeholder)
    : followUps;

  const groups = groupFollowUps(filtered).filter(g => showDone || g.key !== 'done');
  const openCount = followUps.filter(f => !f.is_complete).length;
  const overdueCount = followUps.filter(f => !f.is_complete && isOverdue(f.due_date)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Follow-Ups</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {openCount} open{overdueCount > 0 && <span className="text-red-500 ml-1">· {overdueCount} overdue</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={() => setAddOpen(v => !v)}>
            <Plus size={14} /> Add Follow-Up
          </Button>
        </div>
      </div>

      {/* Add form */}
      {addOpen && (
        <Card>
          <CardBody>
            <div className="space-y-3">
              <Input
                placeholder="What needs to happen? (e.g. 'Kenney to send revised forecast by Friday')"
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addFollowUp()}
                autoFocus
              />
              <div className="flex gap-3">
                <Select
                  className="flex-1"
                  value={addForm.stakeholder_id}
                  onChange={e => setAddForm(f => ({ ...f, stakeholder_id: e.target.value }))}
                >
                  <option value="">No stakeholder</option>
                  {stakeholders.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.title ? ` · ${s.title}` : ''}</option>
                  ))}
                </Select>
                <DatePicker
                  value={addForm.due_date}
                  onChange={val => setAddForm(f => ({ ...f, due_date: val }))}
                  className="w-44"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addFollowUp} disabled={!addForm.description.trim() || saving} className="flex-1">
                  Save Follow-Up
                </Button>
                <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          className="w-52"
          value={filterStakeholder}
          onChange={e => setFilterStakeholder(e.target.value)}
        >
          <option value="">All stakeholders</option>
          {stakeholders.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <button
          onClick={() => setShowDone(v => !v)}
          className={cn(
            'text-sm px-3 py-1.5 rounded-lg border transition-colors',
            showDone
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400'
          )}
        >
          {showDone ? 'Hide Completed' : 'Show Completed'}
        </button>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw size={18} className="animate-spin text-zinc-400" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No follow-ups"
          description="Track commitments made in meetings — things you owe others and things others owe you."
          action={<Button onClick={() => setAddOpen(true)}><Plus size={14} /> Add First Follow-Up</Button>}
        />
      ) : (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.key}>
              <div className={cn('flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2', group.accent)}>
                {group.icon}
                {group.label}
                <span className="ml-1 font-normal normal-case tracking-normal text-zinc-400">({group.items.length})</span>
              </div>
              <div className="space-y-1.5">
                {group.items.map(item => (
                  <FollowUpRow
                    key={item.id}
                    item={item}
                    onComplete={() => complete(item.id, item.is_complete)}
                    onDelete={() => remove(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FollowUpRow({
  item,
  onComplete,
  onDelete,
}: {
  item: FollowUp;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(item.due_date) && !item.is_complete;

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-white dark:bg-zinc-900 group transition-colors',
      overdue
        ? 'border-red-200 dark:border-red-900'
        : 'border-zinc-200 dark:border-zinc-800',
    )}>
      <button
        onClick={onComplete}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          item.is_complete
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-400'
        )}
      >
        {item.is_complete && <Check size={11} strokeWidth={3} />}
      </button>

      <span className={cn(
        'flex-1 text-sm',
        item.is_complete && 'line-through text-zinc-400',
      )}>
        {item.description}
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        {item.stakeholder_name && (
          <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs">
            {item.stakeholder_name}
          </Badge>
        )}
        {item.priority_title && (
          <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs hidden sm:inline-flex">
            {item.priority_title}
          </Badge>
        )}
        {item.due_date && (
          <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-zinc-400')}>
            {formatDate(item.due_date)}
          </span>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
