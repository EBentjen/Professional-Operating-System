'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, FileText, Copy, Check, Pencil } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { Template, TemplateCategory } from '@/lib/types';

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'board', label: 'Board' },
  { value: 'budget', label: 'Budget' },
  { value: 'communication', label: 'Communication' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'hr', label: 'HR / People' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'general', label: 'General' },
];

const EMPTY_FORM = { title: '', category: 'general' as TemplateCategory, description: '', content: '', tags: '' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<Template | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copied, setCopied] = useState(false);
  const [filterCat, setFilterCat] = useState<TemplateCategory | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/templates');
    setTemplates(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTemplate(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(t: Template) {
    setEditTemplate(t);
    setForm({ title: t.title, category: t.category, description: t.description, content: t.content, tags: t.tags });
    setModalOpen(true);
    setView(null);
  }

  async function save() {
    if (!form.title || !form.content) return;
    if (editTemplate) {
      await fetch('/api/templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editTemplate.id }) });
    } else {
      await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteTemplate(id: number) {
    await fetch('/api/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setView(null);
    load();
  }

  async function copyContent(content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayed = filterCat === 'all' ? templates : templates.filter(t => t.category === filterCat);
  const grouped = CATEGORIES.reduce((acc, c) => {
    const items = displayed.filter(t => t.category === c.value);
    if (items.length > 0) acc[c.value] = items;
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Templates & Playbooks</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Saved frameworks for recurring situations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button onClick={openAdd}><Plus size={14} /> New Template</Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('all')} className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterCat === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}>All</button>
        {CATEGORIES.map(c => {
          const count = templates.filter(t => t.category === c.value).length;
          if (count === 0) return null;
          return (
            <button key={c.value} onClick={() => setFilterCat(c.value === filterCat ? 'all' : c.value)} className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterCat === c.value ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}>
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {displayed.length === 0 && !loading ? (
        <EmptyState icon={FileText} title="No templates yet" description="Build your library of reusable frameworks." action={<Button onClick={openAdd}><Plus size={14} /> Create first template</Button>} />
      ) : filterCat === 'all' ? (
        // Grouped view
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => {
            const catLabel = CATEGORIES.find(c => c.value === cat)?.label || cat;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">{catLabel}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map(t => (
                    <Card key={t.id} hoverable onClick={() => setView(t)}>
                      <CardBody className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.title}</p>
                            {t.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{t.description}</p>}
                          </div>
                          <FileText size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0 mt-0.5" />
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {displayed.map(t => (
            <Card key={t.id} hoverable onClick={() => setView(t)}>
              <CardBody className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.title}</p>
                    {t.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{t.description}</p>}
                  </div>
                  <FileText size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0 mt-0.5" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Template viewer */}
      <Modal open={!!view && !editMode} onClose={() => setView(null)} title={view?.title || ''} size="lg">
        {view && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => copyContent(view.content)}>
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openEdit(view)}>
                <Pencil size={13} /> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => deleteTemplate(view.id)}>
                <Trash2 size={13} />
              </Button>
            </div>
            {view.description && <p className="text-sm text-zinc-500">{view.description}</p>}
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4 font-mono text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 max-h-[60vh] overflow-y-auto">
              {view.content}
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTemplate ? 'Edit Template' : 'New Template'} size="lg">
        <div className="space-y-4">
          <Input label="Title *" placeholder="e.g. Board Meeting Prep" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TemplateCategory }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Input label="Tags" placeholder="comma-separated" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <Input label="Description" placeholder="One line about what this template is for" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Textarea label="Content *" placeholder="Template text, markdown, checklist..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={10} className="font-mono text-sm" />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.title || !form.content} className="flex-1">{editTemplate ? 'Save' : 'Create Template'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
