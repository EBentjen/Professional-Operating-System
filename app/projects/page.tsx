'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, RefreshCw, FolderKanban, ChevronDown, ChevronUp, Check, Circle, CheckCircle2, Pencil, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { Project, ProjectItem, Stakeholder, PriorityStatus } from '@/lib/types';

const STATUS_CONFIG: Record<PriorityStatus, { label: string; dot: string; badge: string }> = {
  not_started: { label: 'Not Started', dot: 'bg-zinc-300 dark:bg-zinc-600',    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  in_progress:  { label: 'In Progress', dot: 'bg-blue-500',                    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  blocked:      { label: 'Blocked',     dot: 'bg-red-500',                     badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  done:         { label: 'Done',        dot: 'bg-emerald-500',                  badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

const STATUS_ORDER: PriorityStatus[] = ['in_progress', 'blocked', 'not_started', 'done'];

const EMPTY_FORM = { title: '', status: 'not_started' as PriorityStatus, notes: '', stakeholder_id: '' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<PriorityStatus | 'all'>('all');
  const [selected, setSelected] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([fetch('/api/projects'), fetch('/api/stakeholders')]);
    const pData = await pRes.json();
    const sData = await sRes.json();
    setProjects(Array.isArray(pData) ? pData : []);
    setStakeholders(Array.isArray(sData) ? sData : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep selected project in sync after reload
  useEffect(() => {
    if (selected) {
      const updated = projects.find(p => p.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [projects]);

  function openAdd() {
    setEditProject(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setEditProject(p);
    setForm({ title: p.title, status: p.status, notes: p.notes, stakeholder_id: p.stakeholder_id ? String(p.stakeholder_id) : '' });
    setModalOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    const body = { ...form, stakeholder_id: form.stakeholder_id ? Number(form.stakeholder_id) : null };
    if (editProject) {
      await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editProject.id }) });
    } else {
      await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteProject(id: number) {
    await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (selected?.id === id) setSelected(null);
    load();
  }

  const displayed = filterStatus === 'all' ? projects : projects.filter(p => p.status === filterStatus);
  const counts = projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Projects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Track work across stakeholders with notes and sub-tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button onClick={openAdd}><Plus size={14} /> New Project</Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterStatus === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}
        >
          All ({projects.length})
        </button>
        {STATUS_ORDER.map(s => {
          const c = counts[s] || 0;
          if (c === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? 'all' : s)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterStatus === s ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}
            >
              {STATUS_CONFIG[s].label} ({c})
            </button>
          );
        })}
      </div>

      {/* Layout: list + detail panel */}
      <div className="flex gap-4 items-start">
        {/* Project list */}
        <div className={cn('space-y-2 min-w-0', selected ? 'w-full md:w-2/5 lg:w-1/3' : 'w-full')}>
          {displayed.length === 0 && !loading ? (
            <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to start tracking work." action={<Button onClick={openAdd}><Plus size={14} /> New Project</Button>} />
          ) : (
            displayed.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                active={selected?.id === p.id}
                onClick={() => setSelected(s => s?.id === p.id ? null : p)}
                onEdit={openEdit}
                onDelete={deleteProject}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="hidden md:block flex-1 min-w-0">
            <ProjectDetail
              project={selected}
              onClose={() => setSelected(null)}
              onEdit={(p, e) => openEdit(p, e)}
              onDelete={deleteProject}
              onReload={load}
            />
          </div>
        )}
      </div>

      {/* Mobile detail modal */}
      {selected && (
        <div className="md:hidden">
          <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.title} size="lg">
            <ProjectDetail
              project={selected}
              onClose={() => setSelected(null)}
              onEdit={(p, e) => { setSelected(null); openEdit(p, e); }}
              onDelete={(id) => { deleteProject(id); setSelected(null); }}
              onReload={load}
            />
          </Modal>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editProject ? 'Edit Project' : 'New Project'} size="md">
        <div className="space-y-4">
          <Input label="Title *" placeholder="e.g. Q3 Budget Model" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PriorityStatus }))}>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </Select>
            <Select label="Stakeholder" value={form.stakeholder_id} onChange={e => setForm(f => ({ ...f, stakeholder_id: e.target.value }))}>
              <option value="">None</option>
              {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <Textarea label="Notes" placeholder="Context, goals, blockers..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4} />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.title.trim()} className="flex-1">{editProject ? 'Save' : 'Create Project'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project: p, active, onClick, onEdit, onDelete }: {
  project: Project;
  active: boolean;
  onClick: () => void;
  onEdit: (p: Project, e: React.MouseEvent) => void;
  onDelete: (id: number) => void;
}) {
  const items = p.items || [];
  const done = items.filter(i => i.is_complete).length;
  const cfg = STATUS_CONFIG[p.status];

  return (
    <Card hoverable onClick={onClick} className={cn(active && 'ring-2 ring-zinc-900 dark:ring-zinc-100')}>
      <CardBody className="py-3">
        <div className="flex items-start gap-3">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', cfg.dot)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm leading-snug">{p.title}</p>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={e => onEdit(p, e)} className="p-1 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"><Pencil size={12} /></button>
                <button onClick={e => { e.stopPropagation(); onDelete(p.id); }} className="p-1 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', cfg.badge)}>{cfg.label}</span>
              {p.stakeholder_name && <span className="text-xs text-zinc-400">{p.stakeholder_name}</span>}
              {items.length > 0 && (
                <span className="text-xs text-zinc-400 ml-auto">{done}/{items.length} items</span>
              )}
            </div>
            {p.notes && <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{p.notes}</p>}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Project Detail Panel ─────────────────────────────────────────────────────

function ProjectDetail({ project, onClose, onEdit, onDelete, onReload }: {
  project: Project;
  onClose: () => void;
  onEdit: (p: Project, e: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onReload: () => void;
}) {
  const [items, setItems] = useState<ProjectItem[]>(project.items || []);
  const [newItem, setNewItem] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cfg = STATUS_CONFIG[project.status];

  useEffect(() => { setItems(project.items || []); }, [project]);

  async function addItem() {
    if (!newItem.trim()) return;
    const res = await fetch('/api/project-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, title: newItem.trim(), order_index: items.length }),
    });
    const created = await res.json();
    setItems(prev => [...prev, created]);
    setNewItem('');
    onReload();
  }

  async function toggleItem(item: ProjectItem) {
    await fetch('/api/project-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_complete: item.is_complete ? 0 : 1 }),
    });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_complete: i.is_complete ? 0 : 1 } : i));
    onReload();
  }

  async function saveItemEdit(item: ProjectItem) {
    if (!editingItemTitle.trim()) return;
    await fetch('/api/project-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, title: editingItemTitle.trim() }),
    });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, title: editingItemTitle.trim() } : i));
    setEditingItemId(null);
    onReload();
  }

  async function deleteItem(id: number) {
    await fetch('/api/project-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setItems(prev => prev.filter(i => i.id !== id));
    onReload();
  }

  const done = items.filter(i => i.is_complete).length;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Detail header */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-snug">{project.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
              {project.stakeholder_name && (
                <span className="text-xs text-zinc-500">{project.stakeholder_name}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={e => onEdit(project, e)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"><Pencil size={14} /></button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"><X size={14} /></button>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Notes */}
        {project.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Notes</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{project.notes}</p>
          </div>
        )}

        {/* Sub-items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Sub-items {items.length > 0 && <span className="normal-case font-normal text-zinc-400">— {done}/{items.length} done</span>}
            </p>
          </div>

          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <button onClick={() => toggleItem(item)} className="flex-shrink-0 transition-colors">
                  {item.is_complete
                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : <Circle size={16} className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500" />}
                </button>

                {editingItemId === item.id ? (
                  <input
                    className="flex-1 text-sm bg-transparent border-b border-zinc-300 dark:border-zinc-600 focus:outline-none focus:border-zinc-500 text-zinc-900 dark:text-zinc-100"
                    value={editingItemTitle}
                    onChange={e => setEditingItemTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveItemEdit(item); if (e.key === 'Escape') setEditingItemId(null); }}
                    autoFocus
                  />
                ) : (
                  <span className={cn('flex-1 text-sm', item.is_complete ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200')}>
                    {item.title}
                  </span>
                )}

                {editingItemId === item.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => saveItemEdit(item)} className="text-emerald-500 hover:text-emerald-600"><Check size={13} /></button>
                    <button onClick={() => setEditingItemId(null)} className="text-zinc-400 hover:text-zinc-600"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItemId(item.id); setEditingItemTitle(item.title); }} className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300"><Pencil size={12} /></button>
                    <button onClick={() => deleteItem(item.id)} className="text-zinc-300 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            ))}

            {/* Add item input */}
            <div className="flex items-center gap-2 mt-2">
              <Plus size={14} className="text-zinc-300 flex-shrink-0" />
              <input
                ref={inputRef}
                className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 bg-transparent focus:outline-none"
                placeholder="Add a sub-item…"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
              />
              {newItem && (
                <button onClick={addItem} className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium transition-colors">Add</button>
              )}
            </div>
          </div>
        </div>

        {/* Delete project */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => onDelete(project.id)}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Delete project
          </button>
        </div>
      </div>
    </div>
  );
}
