'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, Zap, CheckCircle2, Circle, Trash2, AlertCircle, Pencil, Check, X, ChevronDown, ChevronUp, History, Upload } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { todayISO, cn } from '@/lib/utils';
import type { DailyFocus, Priority } from '@/lib/types';

const FOCUS_PROMPTS = [
  "What's the one thing that, if done today, moves the needle most?",
  "Is this aligned to your top weekly priority — or is it reactive work?",
  "If you only had 3 hours today, what would you work on?",
  "Are you building or reacting today?",
];

export default function DailyPage() {
  const [focusItems, setFocusItems] = useState<DailyFocus[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ title: '', priority_id: '' });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', priority_id: '' });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<DailyFocus[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTitle, setImportTitle] = useState('AP Approval');
  const [importPreview, setImportPreview] = useState<{ date: string; label: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [promptIdx] = useState(() => Math.floor(Math.random() * FOCUS_PROMPTS.length));

  const today = todayISO();
  const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, wRes] = await Promise.all([
        fetch(`/api/daily-focus?date=${today}`),
        fetch('/api/weeks?current=true'),
      ]);
      const fData = await fRes.json();
      setFocusItems(fData.data);

      const wData = await wRes.json();
      if (wData.data) {
        const pRes = await fetch(`/api/priorities?week_id=${wData.data.id}`);
        const pData = await pRes.json();
        setPriorities(pData.data.filter((p: Priority) => p.status !== 'done'));
      }
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  async function addItem() {
    if (!addForm.title) return;
    await fetch('/api/daily-focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focus_date: today,
        title: addForm.title,
        priority_id: addForm.priority_id ? Number(addForm.priority_id) : null,
        order_index: focusItems.length,
      }),
    });
    setAddForm({ title: '', priority_id: '' });
    setAdding(false);
    load();
  }

  async function toggle(item: DailyFocus) {
    await fetch('/api/daily-focus', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_complete: !item.is_complete }),
    });
    load();
  }

  async function deleteItem(id: number) {
    await fetch(`/api/daily-focus?id=${id}`, { method: 'DELETE' });
    load();
  }

  function startEdit(item: DailyFocus) {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      priority_id: item.priority_id ? String(item.priority_id) : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  function parseDates(raw: string): { date: string; label: string }[] {
    const results: { date: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const line of raw.split('\n')) {
      // Match DD-Mon-YY or DD-Mon-YYYY or YYYY-MM-DD
      const m1 = line.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
      const m2 = line.match(/(\d{4})-(\d{2})-(\d{2})/);
      let iso = '';
      if (m1) {
        const day = m1[1].padStart(2, '0');
        const mon = MONTHS[m1[2].toLowerCase()];
        if (!mon) continue;
        const yr = m1[3].length === 2 ? '20' + m1[3] : m1[3];
        iso = `${yr}-${mon}-${day}`;
      } else if (m2) {
        iso = `${m2[1]}-${m2[2]}-${m2[3]}`;
      } else {
        continue;
      }
      if (seen.has(iso)) continue;
      seen.add(iso);
      const d = new Date(iso + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      results.push({ date: iso, label });
    }
    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  function handleImportTextChange(val: string) {
    setImportText(val);
    setImportPreview(parseDates(val));
    setImportDone(false);
  }

  async function runImport() {
    if (!importPreview.length || !importTitle.trim()) return;
    setImporting(true);
    await fetch('/api/daily-focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: importPreview.map(p => ({ focus_date: p.date, title: importTitle.trim() })),
      }),
    });
    setImporting(false);
    setImportDone(true);
    load();
  }

  async function loadHistory() {
    if (historyItems.length > 0) { setHistoryOpen(o => !o); return; }
    setHistoryLoading(true);
    setHistoryOpen(true);
    const res = await fetch(`/api/daily-focus?lookback=7&date=${today}`);
    const data = await res.json();
    setHistoryItems(data.data);
    setHistoryLoading(false);
  }

  async function saveEdit(id: number) {
    if (!editForm.title.trim()) return;
    await fetch('/api/daily-focus', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title: editForm.title.trim(),
        priority_id: editForm.priority_id ? Number(editForm.priority_id) : null,
      }),
    });
    setEditingId(null);
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw size={20} className="animate-spin text-zinc-400" /></div>;
  }

  const done = focusItems.filter(f => f.is_complete).length;
  const total = focusItems.length;
  const allDone = total > 0 && done === total;
  const tooMany = total > 3;

  // Check alignment: items not linked to a priority
  const unaligned = focusItems.filter(f => !f.priority_id && !f.is_complete);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Daily Focus</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{dayLabel}</h1>
          {total > 0 && (
            <p className="text-sm text-zinc-500 mt-1">
              {done}/{total} complete
              {allDone && <span className="ml-2 text-emerald-600 font-medium">— Strong day.</span>}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setImportOpen(true); setImportDone(false); }}>
          <Upload size={14} /> Import Dates
        </Button>
      </div>

      {/* Challenge Prompt */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Before You Start</p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
          &ldquo;{FOCUS_PROMPTS[promptIdx]}&rdquo;
        </p>
      </div>

      {/* Warnings */}
      {tooMany && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>{total} items</strong> is too many for one day. A focused day has 1–3 high-impact items.
            What can move to tomorrow or be dropped?
          </span>
        </div>
      )}

      {unaligned.length > 0 && !tooMany && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            {unaligned.length} item{unaligned.length !== 1 ? 's' : ''} not linked to a weekly priority.
            Is this reactive work or strategic?
          </span>
        </div>
      )}

      {/* Focus Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Focus Items</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)} disabled={total >= 5}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {focusItems.length === 0 && !adding ? (
            <EmptyState
              icon={Zap}
              title="What are you focused on today?"
              description="Set 1–3 items that move your weekly priorities forward."
              action={<Button size="sm" onClick={() => setAdding(true)}>Add Focus Item</Button>}
            />
          ) : (
            <div className="space-y-2">
              {focusItems.map((item, idx) => (
                <div key={item.id} className="flex items-start gap-3 group">
                  <span className="text-xs text-zinc-300 dark:text-zinc-600 w-4 text-right flex-shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => toggle(item)}
                    className={cn(
                      'flex-shrink-0 mt-0.5 transition-colors',
                      item.is_complete ? 'text-emerald-500' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    )}
                  >
                    {item.is_complete ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>

                  {editingId === item.id ? (
                    <div className="flex-1 min-w-0 space-y-2">
                      <Input
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(item.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <Select
                        value={editForm.priority_id}
                        onChange={e => setEditForm(f => ({ ...f, priority_id: e.target.value }))}
                      >
                        <option value="">Not linked to a priority</option>
                        {priorities.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </Select>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => saveEdit(item.id)} disabled={!editForm.title.trim()}>
                          <Check size={12} /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X size={12} /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn('flex-1 min-w-0', item.is_complete && 'opacity-50')}>
                      <p className={cn('text-sm font-medium text-zinc-900 dark:text-zinc-100', item.is_complete && 'line-through text-zinc-400')}>
                        {item.title}
                      </p>
                      {item.priority_title && (
                        <p className="text-xs text-zinc-500 mt-0.5">← {item.priority_title}</p>
                      )}
                      {!item.priority_id && !item.is_complete && (
                        <p className="text-xs text-amber-500 mt-0.5">Not linked to a weekly priority</p>
                      )}
                    </div>
                  )}

                  {editingId !== item.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-zinc-300 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {adding && (
                <div className="flex items-start gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="What needs to get done today?"
                      value={addForm.title}
                      onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addItem()}
                      autoFocus
                    />
                    <Select
                      value={addForm.priority_id}
                      onChange={e => setAddForm(f => ({ ...f, priority_id: e.target.value }))}
                    >
                      <option value="">Not linked to a priority</option>
                      {priorities.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex gap-1 pt-0.5">
                    <Button size="sm" onClick={addItem} disabled={!addForm.title}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Past Days */}
      <Card>
        <CardHeader onClick={loadHistory} className="cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Past Days</h2>
            </div>
            {historyOpen ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
          </div>
        </CardHeader>

        {historyOpen && (
          <CardBody className="pt-0">
            {historyLoading ? (
              <div className="flex justify-center py-6"><RefreshCw size={16} className="animate-spin text-zinc-400" /></div>
            ) : historyItems.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">No past focus items found.</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(
                  historyItems.reduce((acc, item) => {
                    if (!acc[item.focus_date]) acc[item.focus_date] = [];
                    acc[item.focus_date].push(item);
                    return acc;
                  }, {} as Record<string, DailyFocus[]>)
                ).map(([date, items]) => {
                  const done = items.filter(i => i.is_complete).length;
                  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                  return (
                    <div key={date}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
                        <span className={cn(
                          'text-xs font-medium',
                          done === items.length ? 'text-emerald-500' : 'text-zinc-400'
                        )}>
                          {done}/{items.length} done
                        </span>
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {items.map(item => (
                          <div key={item.id} className="flex items-start gap-2">
                            <span className="flex-shrink-0 mt-0.5">
                              {item.is_complete
                                ? <CheckCircle2 size={15} className="text-emerald-500" />
                                : <Circle size={15} className="text-zinc-300 dark:text-zinc-600" />}
                            </span>
                            <div className={cn('flex-1 min-w-0', item.is_complete && 'opacity-60')}>
                              <p className={cn('text-sm text-zinc-800 dark:text-zinc-200', item.is_complete && 'line-through text-zinc-400')}>
                                {item.title}
                              </p>
                              {item.priority_title && (
                                <p className="text-xs text-zinc-400 mt-0.5">← {item.priority_title}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        )}
      </Card>

      {/* This Week's Priorities for context */}
      {priorities.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Weekly Priorities (for context)</h2>
          </CardHeader>
          <CardBody className="pt-0 space-y-2">
            {priorities.map(p => (
              <div key={p.id} className="flex items-start gap-3">
                <span className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
                  p.status === 'in_progress' ? 'bg-blue-500' :
                  p.status === 'blocked' ? 'bg-red-500' : 'bg-zinc-300'
                )} />
                <div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{p.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{p.outcome}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
      {/* Import Dates Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Dates as Focus Items" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Paste your schedule below. Dates in <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">DD-Mon-YY</code> or <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">YYYY-MM-DD</code> format are detected automatically.
          </p>

          <Input
            label="Focus item title"
            value={importTitle}
            onChange={e => setImportTitle(e.target.value)}
            placeholder="e.g. AP Approval"
          />

          <Textarea
            label="Paste schedule data"
            placeholder={"01-Apr-26\tWednesday\tApril\n03-Apr-26\tFriday\tApril\n..."}
            value={importText}
            onChange={e => handleImportTextChange(e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />

          {importPreview.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
                {importPreview.length} date{importPreview.length !== 1 ? 's' : ''} detected
              </p>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 max-h-48 overflow-y-auto">
                {importPreview.map((p, i) => (
                  <div key={i} className={cn('flex items-center justify-between px-3 py-1.5 text-xs', i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800/50' : '')}>
                    <span className="text-zinc-600 dark:text-zinc-400">{p.label}</span>
                    <span className="text-zinc-400 font-mono">{p.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importText && importPreview.length === 0 && (
            <p className="text-xs text-amber-500">No dates detected. Make sure the format includes dates like <code>01-Apr-26</code>.</p>
          )}

          {importDone && (
            <p className="text-xs text-emerald-600 font-medium">✓ {importPreview.length} focus items created successfully.</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={runImport}
              disabled={!importPreview.length || !importTitle.trim() || importing || importDone}
              className="flex-1"
            >
              {importing ? 'Importing…' : importDone ? '✓ Done' : `Import ${importPreview.length} Items`}
            </Button>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
