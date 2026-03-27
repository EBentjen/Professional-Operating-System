'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Target } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { StatusBadge, ImpactBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatWeekRange, cn } from '@/lib/utils';
import type { Priority, Week, Stakeholder, Deliverable, PriorityStatus, ImpactLevel } from '@/lib/types';

const CHALLENGE_PROMPTS = [
  "What specific outcome proves this priority was completed?",
  "What happens to the business if this doesn't get done this week?",
  "Is this truly week-level, or is this a task inside a bigger priority?",
  "Who is waiting on this? What's the consequence of it slipping?",
  "Are you working on this because it's important, or because it's urgent?",
];

export default function WeeklyPage() {
  const [week, setWeek] = useState<Week | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editPriority, setEditPriority] = useState<Priority | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [challengeIdx] = useState(() => Math.floor(Math.random() * CHALLENGE_PROMPTS.length));

  // Form state
  const [form, setForm] = useState({
    title: '', outcome: '', why_it_matters: '',
    impact: 'high' as ImpactLevel, deadline: '', blocked_reason: '',
  });
  const [deliverableForm, setDeliverableForm] = useState({ title: '', due_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([
        fetch('/api/weeks?current=true'),
        fetch('/api/stakeholders'),
      ]);
      const wData = await wRes.json();
      const sData = await sRes.json();
      const currentWeek: Week = wData.data;
      setWeek(currentWeek);
      setStakeholders(sData.data);

      const pRes = await fetch(`/api/priorities?week_id=${currentWeek.id}`);
      const pData = await pRes.json();
      setPriorities(pData.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ title: '', outcome: '', why_it_matters: '', impact: 'high', deadline: '', blocked_reason: '' });
    setEditPriority(null);
    setAddModalOpen(true);
  }

  function openEdit(p: Priority) {
    setForm({
      title: p.title, outcome: p.outcome, why_it_matters: p.why_it_matters,
      impact: p.impact, deadline: p.deadline || '', blocked_reason: p.blocked_reason || '',
    });
    setEditPriority(p);
    setAddModalOpen(true);
  }

  async function savePriority() {
    if (!week || !form.title || !form.outcome) return;
    if (editPriority) {
      await fetch('/api/priorities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editPriority.id, ...form, deadline: form.deadline || null }),
      });
    } else {
      await fetch('/api/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_id: week.id, ...form, deadline: form.deadline || null, order_index: priorities.length }),
      });
    }
    setAddModalOpen(false);
    load();
  }

  async function updateStatus(id: number, status: PriorityStatus, blocked_reason?: string) {
    await fetch('/api/priorities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, ...(blocked_reason !== undefined ? { blocked_reason } : {}) }),
    });
    load();
  }

  async function deletePriority(id: number) {
    await fetch(`/api/priorities?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function addDeliverable(priorityId: number) {
    if (!deliverableForm.title) return;
    await fetch('/api/deliverables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority_id: priorityId, title: deliverableForm.title, due_date: deliverableForm.due_date || null }),
    });
    setDeliverableForm({ title: '', due_date: '' });
    load();
  }

  async function updateDeliverableStatus(id: number, status: PriorityStatus) {
    await fetch('/api/deliverables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function toggleStakeholder(priorityId: number, stakeholderId: number, hasIt: boolean) {
    if (hasIt) {
      await fetch('/api/priorities/stakeholders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_id: priorityId, stakeholder_id: stakeholderId }),
      });
    } else {
      await fetch('/api/priorities/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_id: priorityId, stakeholder_id: stakeholderId }),
      });
    }
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  const tooManyPriorities = priorities.length > 5;
  const noHighImpact = priorities.length > 0 && !priorities.some(p => p.impact === 'high');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Weekly Priorities</h1>
          {week && (
            <p className="text-sm text-zinc-500 mt-0.5">{formatWeekRange(week.week_start, week.week_end)}</p>
          )}
        </div>
        <Button onClick={openAdd} disabled={priorities.length >= 5}>
          <Plus size={16} /> Add Priority
        </Button>
      </div>

      {/* Chief of Staff Challenge */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Challenge Yourself</p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
          &ldquo;{CHALLENGE_PROMPTS[challengeIdx]}&rdquo;
        </p>
      </div>

      {/* Warnings */}
      {tooManyPriorities && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span><strong>You have {priorities.length} priorities.</strong> More than 5 means none of them are real priorities. What can you cut or defer?</span>
        </div>
      )}
      {noHighImpact && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>None of your priorities are marked <strong>High Impact</strong>. Are you sure you&apos;re working on the right things?</span>
        </div>
      )}

      {/* Priority Cards */}
      {priorities.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No priorities this week"
          description="Define 3–5 outcome-based priorities. Not tasks — what needs to be true by Friday?"
          action={<Button onClick={openAdd}>Add First Priority</Button>}
        />
      ) : (
        <div className="space-y-3">
          {priorities.map((p, idx) => {
            const expanded = expandedId === p.id;
            return (
              <Card key={p.id} className={cn(p.status === 'blocked' && 'border-red-200 dark:border-red-900')}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-zinc-400 w-5 text-right flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                          {p.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ImpactBadge impact={p.impact} />
                          <StatusBadge status={p.status} />
                          <button
                            onClick={() => setExpandedId(expanded ? null : p.id)}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">Done when:</span> {p.outcome}
                      </p>

                      {p.status === 'blocked' && p.blocked_reason && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                          <span>{p.blocked_reason}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {p.deadline && (
                          <span className="text-xs text-zinc-400">Due {formatDate(p.deadline)}</span>
                        )}
                        {p.stakeholders?.map(s => (
                          <Badge key={s.id} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded section */}
                {expanded && (
                  <CardBody className="pt-0 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                    <div className="space-y-4 pt-3">
                      {/* Status controls */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Status</p>
                        <div className="flex gap-2 flex-wrap">
                          {(['not_started', 'in_progress', 'blocked', 'done'] as PriorityStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(p.id, s)}
                              className={cn(
                                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                                p.status === s
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                              )}
                            >
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                        {p.status === 'blocked' && (
                          <Input
                            className="mt-2"
                            placeholder="What's blocking this?"
                            defaultValue={p.blocked_reason || ''}
                            onBlur={(e) => updateStatus(p.id, 'blocked', e.target.value)}
                          />
                        )}
                      </div>

                      {/* Why it matters */}
                      {p.why_it_matters && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Why It Matters</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.why_it_matters}</p>
                        </div>
                      )}

                      {/* Deliverables */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Deliverables</p>
                        {p.deliverables && p.deliverables.length > 0 && (
                          <ul className="space-y-1.5 mb-2">
                            {p.deliverables.map((d: Deliverable) => (
                              <li key={d.id} className="flex items-center gap-2 text-sm">
                                <Select
                                  className="w-28 text-xs py-1"
                                  value={d.status}
                                  onChange={e => updateDeliverableStatus(d.id, e.target.value as PriorityStatus)}
                                >
                                  <option value="not_started">Not started</option>
                                  <option value="in_progress">In progress</option>
                                  <option value="blocked">Blocked</option>
                                  <option value="done">Done</option>
                                </Select>
                                <span className={cn('flex-1', d.status === 'done' && 'line-through text-zinc-400')}>
                                  {d.title}
                                </span>
                                {d.due_date && (
                                  <span className="text-xs text-zinc-400">{formatDate(d.due_date)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add deliverable..."
                            value={deliverableForm.title}
                            onChange={e => setDeliverableForm(f => ({ ...f, title: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addDeliverable(p.id)}
                            className="flex-1"
                          />
                          <Input
                            type="date"
                            value={deliverableForm.due_date}
                            onChange={e => setDeliverableForm(f => ({ ...f, due_date: e.target.value }))}
                            className="w-36"
                          />
                          <Button variant="secondary" size="sm" onClick={() => addDeliverable(p.id)}>
                            <Plus size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Stakeholders */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Stakeholders</p>
                        <div className="flex flex-wrap gap-2">
                          {stakeholders.map(s => {
                            const hasIt = p.stakeholders?.some(ps => ps.id === s.id) ?? false;
                            return (
                              <button
                                key={s.id}
                                onClick={() => toggleStakeholder(p.id, s.id, hasIt)}
                                className={cn(
                                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                                  hasIt
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900'
                                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400'
                                )}
                              >
                                {s.name}
                                {s.title && <span className="ml-1 opacity-60">· {s.title}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => deletePriority(p.id)}>
                          <Trash2 size={14} /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={editPriority ? 'Edit Priority' : 'Add Priority'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Good priority = outcome, not task</p>
            <p>❌ &ldquo;Work on board deck&rdquo;</p>
            <p>✅ &ldquo;Board deck approved and sent by Thursday&rdquo;</p>
          </div>

          <Input
            label="Priority title *"
            placeholder="What needs to be true by end of week?"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />

          <Textarea
            label="Definition of done *"
            placeholder="How will you know this is complete? Be specific."
            value={form.outcome}
            onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
            rows={2}
          />

          <Textarea
            label="Why it matters"
            placeholder="What's the business consequence if this slips?"
            value={form.why_it_matters}
            onChange={e => setForm(f => ({ ...f, why_it_matters: e.target.value }))}
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Impact"
              value={form.impact}
              onChange={e => setForm(f => ({ ...f, impact: e.target.value as ImpactLevel }))}
            >
              <option value="high">High Impact</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Input
              label="Deadline"
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={savePriority} disabled={!form.title || !form.outcome} className="flex-1">
              {editPriority ? 'Save Changes' : 'Add Priority'}
            </Button>
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
