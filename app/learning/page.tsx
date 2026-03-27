'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDate, cn } from '@/lib/utils';
import type { Learning, SourceType } from '@/lib/types';

const SOURCE_TYPES: { value: SourceType; label: string; icon: string }[] = [
  { value: 'book', label: 'Book', icon: '📚' },
  { value: 'article', label: 'Article', icon: '📄' },
  { value: 'podcast', label: 'Podcast', icon: '🎙️' },
  { value: 'conversation', label: 'Conversation', icon: '💬' },
  { value: 'course', label: 'Course', icon: '🎓' },
  { value: 'other', label: 'Other', icon: '💡' },
];

const EMPTY_FORM = { title: '', source: '', source_type: 'article' as SourceType, key_takeaway: '', action_item: '', tags: '', date: '' };

export default function LearningPage() {
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLearning, setEditLearning] = useState<Learning | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState<SourceType | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/learnings');
    setLearnings(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditLearning(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(l: Learning) {
    setEditLearning(l);
    setForm({ title: l.title, source: l.source, source_type: l.source_type, key_takeaway: l.key_takeaway, action_item: l.action_item, tags: l.tags, date: l.date });
    setModalOpen(true);
  }

  async function save() {
    if (!form.title) return;
    if (editLearning) {
      await fetch('/api/learnings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editLearning.id }) });
    } else {
      await fetch('/api/learnings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteLearning(id: number) {
    await fetch('/api/learnings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  const displayed = filterType === 'all' ? learnings : learnings.filter(l => l.source_type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Learning Log</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Books, articles, conversations — what you learned and what to do with it</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button onClick={openAdd}><Plus size={14} /> Add Learning</Button>
        </div>
      </div>

      {/* Source type filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('all')} className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterType === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}>
          All ({learnings.length})
        </button>
        {SOURCE_TYPES.map(st => {
          const count = learnings.filter(l => l.source_type === st.value).length;
          if (count === 0) return null;
          return (
            <button key={st.value} onClick={() => setFilterType(st.value === filterType ? 'all' : st.value)} className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterType === st.value ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}>
              {st.icon} {st.label} ({count})
            </button>
          );
        })}
      </div>

      {displayed.length === 0 && !loading ? (
        <EmptyState icon={BookOpen} title="No learnings logged" description="Capture what you read, hear, and discuss — and what to do with it." action={<Button onClick={openAdd}><Plus size={14} /> Log a learning</Button>} />
      ) : (
        <div className="space-y-3">
          {displayed.map(l => {
            const st = SOURCE_TYPES.find(s => s.value === l.source_type);
            return (
              <Card key={l.id}>
                <CardHeader className="cursor-pointer" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  <div className="flex items-start justify-between w-full gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base">{st?.icon}</span>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{l.title}</p>
                      </div>
                      {l.source && <p className="text-xs text-zinc-400 ml-6">{l.source} · {formatDate(l.date)}</p>}
                      {!l.source && <p className="text-xs text-zinc-400 ml-6">{formatDate(l.date)}</p>}
                      {l.key_takeaway && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{l.key_takeaway}</p>
                      )}
                    </div>
                    {expanded === l.id ? <ChevronUp size={16} className="text-zinc-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-zinc-400 shrink-0 mt-1" />}
                  </div>
                </CardHeader>

                {expanded === l.id && (
                  <CardBody className="border-t border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-3 text-sm">
                      {l.key_takeaway && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Key Takeaway</p>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{l.key_takeaway}</p>
                        </div>
                      )}
                      {l.action_item && (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">Action / Apply</p>
                          <p className="text-amber-800 dark:text-amber-300">{l.action_item}</p>
                        </div>
                      )}
                      {l.tags && (
                        <p className="text-xs text-zinc-400">Tags: {l.tags}</p>
                      )}
                      <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(l)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => deleteLearning(l.id)}><Trash2 size={13} /> Delete</Button>
                      </div>
                    </div>
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editLearning ? 'Edit Learning' : 'Log a Learning'} size="lg">
        <div className="space-y-4">
          <Input label="Title *" placeholder="e.g. Zero to One, Chapter 3 key ideas" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Source type" value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value as SourceType }))}>
              {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
            </Select>
            <Input label="Source" placeholder="Book title, article URL, person's name" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
          </div>
          <Textarea label="Key takeaway" placeholder="What's the single most important thing you learned?" value={form.key_takeaway} onChange={e => setForm(f => ({ ...f, key_takeaway: e.target.value }))} rows={3} />
          <Textarea label="Action item — how to apply it" placeholder="Specific thing you'll do differently because of this" value={form.action_item} onChange={e => setForm(f => ({ ...f, action_item: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tags" placeholder="leadership, finance, strategy" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            <DatePicker label="Date" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.title} className="flex-1">{editLearning ? 'Save' : 'Log Learning'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
