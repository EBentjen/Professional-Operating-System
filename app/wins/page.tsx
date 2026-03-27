'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Trophy, Copy, Check } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDate } from '@/lib/utils';
import type { Win, WinCategory } from '@/lib/types';

const CATEGORIES: { value: WinCategory; label: string; color: string }[] = [
  { value: 'financial', label: 'Financial', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'leadership', label: 'Leadership', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  { value: 'strategic', label: 'Strategic', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'operational', label: 'Operational', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'team', label: 'Team', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  { value: 'general', label: 'General', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
];

const EMPTY_FORM = { title: '', description: '', impact: '', metric: '', category: 'general' as WinCategory, date: '' };

export default function WinsPage() {
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editWin, setEditWin] = useState<Win | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copied, setCopied] = useState(false);
  const [filterCat, setFilterCat] = useState<WinCategory | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/wins');
    setWins(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditWin(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(w: Win) {
    setEditWin(w);
    setForm({ title: w.title, description: w.description, impact: w.impact, metric: w.metric, category: w.category, date: w.date });
    setModalOpen(true);
  }

  async function save() {
    if (!form.title) return;
    if (editWin) {
      await fetch('/api/wins', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editWin.id }) });
    } else {
      await fetch('/api/wins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteWin(id: number) {
    await fetch('/api/wins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  async function copyResumeText() {
    const filtered = filterCat === 'all' ? wins : wins.filter(w => w.category === filterCat);
    const text = filtered.map(w => {
      const metric = w.metric ? ` (${w.metric})` : '';
      const impact = w.impact ? ` — ${w.impact}` : '';
      return `• ${w.title}${metric}${impact}`;
    }).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayed = filterCat === 'all' ? wins : wins.filter(w => w.category === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Wins & Achievements</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your running record — for reviews, résumés, and momentum</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button variant="secondary" size="sm" onClick={copyResumeText}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Resume Copy</>}
          </Button>
          <Button onClick={openAdd}><Plus size={14} /> Add Win</Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterCat === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
        >
          All ({wins.length})
        </button>
        {CATEGORIES.map(c => {
          const count = wins.filter(w => w.category === c.value).length;
          if (count === 0) return null;
          return (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterCat === c.value ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {displayed.length === 0 && !loading ? (
        <EmptyState icon={Trophy} title="No wins logged yet" description="Start capturing achievements — big and small." action={<Button onClick={openAdd}><Plus size={14} /> Log your first win</Button>} />
      ) : (
        <div className="space-y-3">
          {displayed.map(w => {
            const cat = CATEGORIES.find(c => c.value === w.category);
            return (
              <Card key={w.id} hoverable onClick={() => openEdit(w)}>
                <CardBody className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{w.title}</p>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${cat?.color}`}>{cat?.label}</span>
                      </div>
                      {w.metric && (
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">{w.metric}</p>
                      )}
                      {w.description && (
                        <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{w.description}</p>
                      )}
                      {w.impact && (
                        <p className="text-xs text-zinc-400 mt-1 italic">{w.impact}</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-1.5">{formatDate(w.date)}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editWin ? 'Edit Win' : 'Log a Win'} size="lg">
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong>Tip for résumé use:</strong> Frame wins as "Achieved X by doing Y, resulting in Z". The metric field is your quantifiable proof.
          </div>
          <Input label="Win title *" placeholder="e.g. Closed FY budget 2 weeks early" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Quantifiable metric" placeholder="e.g. $2.3M savings, 15% under budget, 3 weeks ahead of schedule" value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))} />
          <Textarea label="Description" placeholder="What did you do? Be specific enough to explain in an interview." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Textarea label="Business impact" placeholder="Why did this matter? Revenue, risk, efficiency, team, culture?" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as WinCategory }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <DatePicker label="Date" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.title} className="flex-1">{editWin ? 'Save' : 'Log Win'}</Button>
            {editWin && <Button variant="danger" onClick={async () => { await deleteWin(editWin.id); setModalOpen(false); }}><Trash2 size={14} /></Button>}
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
