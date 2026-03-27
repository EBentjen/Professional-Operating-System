'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, RefreshCw, Scale } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatePicker } from '@/components/ui/DatePicker';
import { cn, formatDate } from '@/lib/utils';
import type { Decision } from '@/lib/types';

const EMPTY_FORM = { title: '', context: '', decision: '', rationale: '', alternatives: '', stakeholders: '', outcome: '', tags: '', date: '' };

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDecision, setEditDecision] = useState<Decision | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/decisions');
    setDecisions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditDecision(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(d: Decision) {
    setEditDecision(d);
    setForm({
      title: d.title,
      context: d.context,
      decision: d.decision,
      rationale: d.rationale,
      alternatives: d.alternatives,
      stakeholders: d.stakeholders === '[]' ? '' : JSON.parse(d.stakeholders).join(', '),
      outcome: d.outcome,
      tags: d.tags,
      date: d.date,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.title || !form.decision) return;
    const body = {
      ...form,
      stakeholders: JSON.stringify(form.stakeholders.split(',').map(s => s.trim()).filter(Boolean)),
    };
    if (editDecision) {
      await fetch('/api/decisions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editDecision.id }) });
    } else {
      await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteDecision(id: number) {
    await fetch('/api/decisions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Decision Log</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Record key decisions, rationale, and outcomes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button onClick={openAdd}><Plus size={14} /> Log Decision</Button>
        </div>
      </div>

      {decisions.length === 0 && !loading ? (
        <EmptyState icon={Scale} title="No decisions logged" description="Start recording key decisions — rationale now saves time later." action={<Button onClick={openAdd}><Plus size={14} /> Log your first decision</Button>} />
      ) : (
        <div className="space-y-3">
          {decisions.map(d => (
            <Card key={d.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{d.title}</p>
                    <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{d.decision}</p>
                    <p className="text-xs text-zinc-400 mt-1">{formatDate(d.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {expanded === d.id ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                  </div>
                </div>
              </CardHeader>

              {expanded === d.id && (
                <CardBody className="border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-3 text-sm">
                    {d.context && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Context</p>
                        <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{d.context}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Decision</p>
                      <p className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap font-medium">{d.decision}</p>
                    </div>
                    {d.rationale && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Rationale</p>
                        <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{d.rationale}</p>
                      </div>
                    )}
                    {d.alternatives && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Alternatives Considered</p>
                        <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{d.alternatives}</p>
                      </div>
                    )}
                    {d.stakeholders && d.stakeholders !== '[]' && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">People Involved</p>
                        <p className="text-zinc-700 dark:text-zinc-300">{JSON.parse(d.stakeholders).join(', ')}</p>
                      </div>
                    )}
                    {d.outcome && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Outcome / Result</p>
                        <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{d.outcome}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteDecision(d.id)}><Trash2 size={13} /> Delete</Button>
                    </div>
                  </div>
                </CardBody>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editDecision ? 'Edit Decision' : 'Log Decision'} size="lg">
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-500 space-y-1">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Why log decisions?</p>
            <p>Future you will thank present you. Recorded rationale prevents revisiting closed decisions and builds institutional memory.</p>
          </div>
          <Input label="Decision title *" placeholder="e.g. Move to zero-based budgeting for FY27" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Context" placeholder="What situation or problem triggered this decision?" value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} rows={2} />
          <Textarea label="Decision *" placeholder="What was decided? Be specific and clear." value={form.decision} onChange={e => setForm(f => ({ ...f, decision: e.target.value }))} rows={2} />
          <Textarea label="Rationale" placeholder="Why this option? Key factors that drove the choice." value={form.rationale} onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} rows={2} />
          <Textarea label="Alternatives considered" placeholder="What other options were on the table?" value={form.alternatives} onChange={e => setForm(f => ({ ...f, alternatives: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="People involved" placeholder="e.g. CEO, CFO, Board" value={form.stakeholders} onChange={e => setForm(f => ({ ...f, stakeholders: e.target.value }))} />
            <DatePicker label="Date" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} />
          </div>
          <Textarea label="Outcome (fill in later)" placeholder="How did it play out?" value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} rows={2} />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.title || !form.decision} className="flex-1">{editDecision ? 'Save' : 'Log Decision'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
