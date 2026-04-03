'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, Users, CheckCircle2, Circle, Trash2, AlertCircle, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';
import type { Stakeholder, FollowUp, Priority, StakeholderProject, PriorityStatus, Project, ProjectStatus } from '@/lib/types';

interface StakeholderWithContext extends Stakeholder {
  priorities: (Priority & { week_start?: string })[];
  followUps: FollowUp[];
  projects: StakeholderProject[];
  trackerProjects: Project[];
}

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; dot: string; text: string }> = {
  not_started: { label: 'Not Started', dot: 'bg-zinc-400',     text: 'text-zinc-500' },
  in_progress:  { label: 'In Progress', dot: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400' },
  in_review:    { label: 'In Review',   dot: 'bg-purple-500',  text: 'text-purple-600 dark:text-purple-400' },
  blocked:      { label: 'Blocked',     dot: 'bg-red-500',     text: 'text-red-600 dark:text-red-400' },
  done:         { label: 'Done',        dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
};

const STATUS_CONFIG: Record<PriorityStatus, { label: string; dot: string; text: string }> = {
  not_started: { label: 'Not Started', dot: 'bg-zinc-400',    text: 'text-zinc-500' },
  in_progress:  { label: 'In Progress', dot: 'bg-blue-500',   text: 'text-blue-600 dark:text-blue-400' },
  blocked:      { label: 'Blocked',     dot: 'bg-red-500',    text: 'text-red-600 dark:text-red-400' },
  done:         { label: 'Done',        dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
};

export default function StakeholdersPage() {
  const [stakeholders, setStakeholders] = useState<StakeholderWithContext[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [currentPriorities, setCurrentPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStakeholderOpen, setAddStakeholderOpen] = useState(false);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<StakeholderWithContext | null>(null);
  const [newProject, setNewProject] = useState('');
  const [addingProject, setAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<StakeholderProject | null>(null);
  const [projectEditForm, setProjectEditForm] = useState({ title: '', status: 'not_started' as PriorityStatus, notes: '' });

  const [stakeholderForm, setStakeholderForm] = useState({ name: '', title: '', tier: 'secondary', notes: '' });
  const [followUpForm, setFollowUpForm] = useState({ description: '', stakeholder_id: '', priority_id: '', due_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, fRes, wRes, pjRes, tpRes] = await Promise.all([
        fetch('/api/stakeholders'),
        fetch('/api/follow-ups?open=true'),
        fetch('/api/weeks?current=true'),
        fetch('/api/stakeholder-projects'),
        fetch('/api/projects'),
      ]);
      const sData = await sRes.json();
      const fData = await fRes.json();
      const wData = await wRes.json();
      const pjData: StakeholderProject[] = await pjRes.json();
      const tpData: Project[] = await tpRes.json();

      const stakeholderList: Stakeholder[] = sData.data;
      const followUpList: FollowUp[] = fData.data;

      let priorities: Priority[] = [];
      if (wData.data) {
        const pRes = await fetch(`/api/priorities?week_id=${wData.data.id}`);
        const pData = await pRes.json();
        priorities = pData.data;
        setCurrentPriorities(priorities);
      }

      const enriched: StakeholderWithContext[] = stakeholderList.map(s => ({
        ...s,
        priorities: priorities.filter(p => p.stakeholders?.some(ps => ps.id === s.id)),
        followUps: followUpList.filter(f => f.stakeholder_id === s.id),
        projects: pjData.filter(p => p.stakeholder_id === s.id),
        trackerProjects: tpData.filter(p => p.stakeholder_id === s.id),
      }));

      setStakeholders(enriched);
      setFollowUps(followUpList);

      // Refresh selected stakeholder if open
      if (selectedStakeholder) {
        const updated = enriched.find(s => s.id === selectedStakeholder.id);
        if (updated) setSelectedStakeholder(updated);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStakeholder]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addStakeholder() {
    if (!stakeholderForm.name) return;
    await fetch('/api/stakeholders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stakeholderForm) });
    setAddStakeholderOpen(false);
    setStakeholderForm({ name: '', title: '', tier: 'secondary', notes: '' });
    load();
  }

  async function deleteStakeholder(id: number) {
    await fetch(`/api/stakeholders?id=${id}`, { method: 'DELETE' });
    setSelectedStakeholder(null);
    load();
  }

  async function addFollowUp() {
    if (!followUpForm.description) return;
    await fetch('/api/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: followUpForm.description,
        stakeholder_id: followUpForm.stakeholder_id ? Number(followUpForm.stakeholder_id) : null,
        priority_id: followUpForm.priority_id ? Number(followUpForm.priority_id) : null,
        due_date: followUpForm.due_date || null,
      }),
    });
    setAddFollowUpOpen(false);
    setFollowUpForm({ description: '', stakeholder_id: '', priority_id: '', due_date: '' });
    load();
  }

  async function completeFollowUp(id: number) {
    await fetch('/api/follow-ups', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_complete: true }) });
    load();
  }

  async function deleteFollowUp(id: number) {
    await fetch(`/api/follow-ups?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function addProject() {
    if (!newProject.trim() || !selectedStakeholder) return;
    setAddingProject(true);
    await fetch('/api/stakeholder-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stakeholder_id: selectedStakeholder.id, title: newProject.trim() }),
    });
    setNewProject('');
    setAddingProject(false);
    load();
  }

  async function updateProjectStatus(id: number, status: PriorityStatus) {
    await fetch('/api/stakeholder-projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  }

  async function saveProjectEdit() {
    if (!editingProject) return;
    await fetch('/api/stakeholder-projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingProject.id, ...projectEditForm }) });
    setEditingProject(null);
    load();
  }

  async function deleteProject(id: number) {
    await fetch('/api/stakeholder-projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  function openProjectEdit(p: StakeholderProject) {
    setEditingProject(p);
    setProjectEditForm({ title: p.title, status: p.status, notes: p.notes });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={20} className="animate-spin text-zinc-400" /></div>;

  const primaryStakeholders = stakeholders.filter(s => s.tier === 'primary');
  const secondaryStakeholders = stakeholders.filter(s => s.tier === 'secondary');
  const today = new Date().toISOString().split('T')[0];
  const overdueFollowUps = followUps.filter(f => f.due_date && f.due_date < today);

  const activeProjects = stakeholders.flatMap(s => s.projects).filter(p => p.status !== 'done');
  const blockedProjects = activeProjects.filter(p => p.status === 'blocked');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Stakeholders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">People, projects, and follow-ups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAddFollowUpOpen(true)}>
            <Plus size={14} /> Follow-Up
          </Button>
          <Button size="sm" onClick={() => setAddStakeholderOpen(true)}>
            <Plus size={14} /> Person
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {blockedProjects.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              {blockedProjects.length} blocked project{blockedProjects.length !== 1 ? 's' : ''}
            </span>
          </div>
          {blockedProjects.map(p => {
            const owner = stakeholders.find(s => s.id === p.stakeholder_id);
            return (
              <p key={p.id} className="text-sm text-red-700 dark:text-red-400 ml-5">
                <span className="font-medium">{owner?.name}:</span> {p.title}
              </p>
            );
          })}
        </div>
      )}

      {overdueFollowUps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {overdueFollowUps.length} overdue follow-up{overdueFollowUps.length !== 1 ? 's' : ''}
            </span>
          </div>
          {overdueFollowUps.map(f => (
            <p key={f.id} className="text-sm text-amber-700 dark:text-amber-400 ml-5">
              {f.stakeholder_name && <span className="font-medium">{f.stakeholder_name}: </span>}
              {f.description} <span className="text-amber-400">({formatDate(f.due_date)})</span>
            </p>
          ))}
        </div>
      )}

      {/* Open Follow-Ups */}
      {followUps.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Open Follow-Ups</h2>
              <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{followUps.length}</Badge>
            </div>
          </CardHeader>
          <CardBody className="pt-0 space-y-2">
            {followUps.map(f => (
              <div key={f.id} className="flex items-start gap-3 group">
                <button onClick={() => completeFollowUp(f.id)} className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors flex-shrink-0">
                  <Circle size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{f.description}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {f.stakeholder_name && <span className="text-xs font-medium text-zinc-500">→ {f.stakeholder_name}</span>}
                    {f.priority_title && <span className="text-xs text-zinc-400">re: {f.priority_title}</span>}
                    {f.due_date && <span className={cn('text-xs font-medium', f.due_date < today ? 'text-red-600' : 'text-zinc-400')}>Due {formatDate(f.due_date)}</span>}
                  </div>
                </div>
                <button onClick={() => deleteFollowUp(f.id)} className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Primary Stakeholders */}
      {primaryStakeholders.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Primary</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {primaryStakeholders.map(s => (
              <StakeholderCard key={s.id} stakeholder={s} onClick={() => setSelectedStakeholder(s)} />
            ))}
          </div>
        </div>
      )}

      {/* Secondary Stakeholders */}
      {secondaryStakeholders.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Secondary</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {secondaryStakeholders.map(s => (
              <StakeholderCard key={s.id} stakeholder={s} onClick={() => setSelectedStakeholder(s)} />
            ))}
          </div>
        </div>
      )}

      {stakeholders.length === 0 && (
        <EmptyState icon={Users} title="No stakeholders yet" description="Add people to track projects and follow-ups." action={<Button onClick={() => setAddStakeholderOpen(true)}>Add Stakeholder</Button>} />
      )}

      {/* Stakeholder Detail Modal */}
      {selectedStakeholder && (
        <Modal open={!!selectedStakeholder} onClose={() => setSelectedStakeholder(null)} title={selectedStakeholder.name} size="lg">
          <div className="space-y-5">
            {selectedStakeholder.title && <p className="text-sm text-zinc-500 -mt-2">{selectedStakeholder.title}</p>}

            {/* Projects */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Projects</p>
                <span className="text-xs text-zinc-400">
                  {selectedStakeholder.projects.filter(p => p.status !== 'done').length} active
                </span>
              </div>

              {selectedStakeholder.projects.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">No projects yet — add one below</p>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {selectedStakeholder.projects.map(p => {
                    const st = STATUS_CONFIG[p.status];
                    return (
                      <div key={p.id} className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        {/* Status dot — click to cycle */}
                        <button
                          onClick={() => {
                            const order: PriorityStatus[] = ['not_started', 'in_progress', 'blocked', 'done'];
                            const next = order[(order.indexOf(p.status) + 1) % order.length];
                            updateProjectStatus(p.id, next);
                          }}
                          title={`Status: ${st.label} — click to advance`}
                          className="mt-0.5 shrink-0"
                        >
                          <span className={cn('block w-2.5 h-2.5 rounded-full transition-opacity hover:opacity-70', st.dot)} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', p.status === 'done' && 'line-through text-zinc-400')}>
                            {p.title}
                          </p>
                          {p.notes && <p className="text-xs text-zinc-500 mt-0.5">{p.notes}</p>}
                          <p className={cn('text-xs mt-0.5', st.text)}>{st.label}</p>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openProjectEdit(p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => deleteProject(p.id)} className="text-zinc-400 hover:text-red-500 p-1 rounded">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline add project */}
              <div className="flex gap-2">
                <input
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addProject()}
                  placeholder="Add a project..."
                  className="flex-1 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 placeholder:text-zinc-400"
                />
                <Button size="sm" onClick={addProject} disabled={!newProject.trim() || addingProject}>
                  <Plus size={13} />
                </Button>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">Click the status dot to advance: Not Started → In Progress → Blocked → Done</p>
            </div>

            {/* Tracker Projects */}
            {selectedStakeholder.trackerProjects.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
                  From Project Tracker
                </p>
                <div className="space-y-1.5">
                  {selectedStakeholder.trackerProjects.map(p => {
                    const st = PROJECT_STATUS_CONFIG[p.status as ProjectStatus] || PROJECT_STATUS_CONFIG.not_started;
                    return (
                      <div key={p.id} className="flex items-start gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <span className={cn('block w-2.5 h-2.5 rounded-full shrink-0 mt-0.5', st.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', p.status === 'done' && 'line-through text-zinc-400')}>
                            {p.title}
                          </p>
                          {p.notes && <p className="text-xs text-zinc-500 mt-0.5 truncate">{p.notes}</p>}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn('text-xs', st.text)}>{st.label}</span>
                            {p.due_date && (
                              <span className={cn('text-xs', p.due_date < new Date().toISOString().slice(0,10) && p.status !== 'done' ? 'text-red-500' : 'text-zinc-400')}>
                                · Due {new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Priorities */}
            {selectedStakeholder.priorities.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">This Week&apos;s Priorities</p>
                <ul className="space-y-1.5">
                  {selectedStakeholder.priorities.map(p => (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
                        p.status === 'done' ? 'bg-emerald-500' :
                        p.status === 'blocked' ? 'bg-red-500' :
                        p.status === 'in_progress' ? 'bg-blue-500' : 'bg-zinc-400'
                      )} />
                      <span>{p.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Open Follow-Ups */}
            {selectedStakeholder.followUps.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Open Follow-Ups</p>
                <ul className="space-y-1.5">
                  {selectedStakeholder.followUps.map(f => (
                    <li key={f.id} className="flex items-start gap-2">
                      <button onClick={() => completeFollowUp(f.id)} className="text-zinc-400 hover:text-emerald-600 mt-0.5">
                        <Circle size={14} />
                      </button>
                      <span className="text-sm flex-1">{f.description}</span>
                      {f.due_date && <span className="text-xs text-zinc-400 shrink-0">{formatDate(f.due_date)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {selectedStakeholder.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedStakeholder.notes}</p>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="danger" size="sm" onClick={() => deleteStakeholder(selectedStakeholder.id)}>
                <Trash2 size={14} /> Remove Person
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Project Modal */}
      <Modal open={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
        <div className="space-y-4">
          <Input label="Project title" value={projectEditForm.title} onChange={e => setProjectEditForm(f => ({ ...f, title: e.target.value }))} />
          <Select label="Status" value={projectEditForm.status} onChange={e => setProjectEditForm(f => ({ ...f, status: e.target.value as PriorityStatus }))}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </Select>
          <Textarea label="Notes" placeholder="Context, blockers, next steps..." value={projectEditForm.notes} onChange={e => setProjectEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          <div className="flex gap-3">
            <Button onClick={saveProjectEdit} disabled={!projectEditForm.title} className="flex-1">Save</Button>
            <Button variant="secondary" onClick={() => setEditingProject(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Stakeholder Modal */}
      <Modal open={addStakeholderOpen} onClose={() => setAddStakeholderOpen(false)} title="Add Person">
        <div className="space-y-4">
          <Input label="Name *" placeholder="e.g. Sarah Chen" value={stakeholderForm.name} onChange={e => setStakeholderForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Title" placeholder="e.g. CFO" value={stakeholderForm.title} onChange={e => setStakeholderForm(f => ({ ...f, title: e.target.value }))} />
          <Select label="Tier" value={stakeholderForm.tier} onChange={e => setStakeholderForm(f => ({ ...f, tier: e.target.value }))}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </Select>
          <Textarea label="Notes" placeholder="Working style, preferences, context..." value={stakeholderForm.notes} onChange={e => setStakeholderForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex gap-3">
            <Button onClick={addStakeholder} disabled={!stakeholderForm.name} className="flex-1">Add</Button>
            <Button variant="secondary" onClick={() => setAddStakeholderOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Follow-Up Modal */}
      <Modal open={addFollowUpOpen} onClose={() => setAddFollowUpOpen(false)} title="Add Follow-Up">
        <div className="space-y-4">
          <Textarea label="What needs to happen? *" placeholder="e.g. Send updated budget model to CFO" value={followUpForm.description} onChange={e => setFollowUpForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Select label="Stakeholder" value={followUpForm.stakeholder_id} onChange={e => setFollowUpForm(f => ({ ...f, stakeholder_id: e.target.value }))}>
            <option value="">No specific person</option>
            {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}{s.title ? ` · ${s.title}` : ''}</option>)}
          </Select>
          <Select label="Related Priority" value={followUpForm.priority_id} onChange={e => setFollowUpForm(f => ({ ...f, priority_id: e.target.value }))}>
            <option value="">Not linked to a priority</option>
            {currentPriorities.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <DatePicker label="Due date" value={followUpForm.due_date} onChange={val => setFollowUpForm(f => ({ ...f, due_date: val }))} />
          <div className="flex gap-3">
            <Button onClick={addFollowUp} disabled={!followUpForm.description} className="flex-1">Add</Button>
            <Button variant="secondary" onClick={() => setAddFollowUpOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StakeholderCard({ stakeholder, onClick }: { stakeholder: StakeholderWithContext; onClick: () => void }) {
  const [showProjects, setShowProjects] = useState(false);
  const activeProjects = stakeholder.projects.filter(p => p.status !== 'done');
  const activeTrackerProjects = stakeholder.trackerProjects.filter(p => p.status !== 'done');
  const allActiveProjects = activeProjects.length + activeTrackerProjects.length;
  const blockedProjects = [
    ...activeProjects.filter(p => p.status === 'blocked'),
    ...activeTrackerProjects.filter(p => p.status === 'blocked'),
  ];

  return (
    <Card className="transition-all">
      <CardBody className="py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={onClick}>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{stakeholder.name}</p>
            {stakeholder.title && <p className="text-xs text-zinc-500 mt-0.5">{stakeholder.title}</p>}
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {blockedProjects.length > 0 && (
              <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                {blockedProjects.length} blocked
              </Badge>
            )}
            {allActiveProjects > 0 && blockedProjects.length === 0 && (
              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {allActiveProjects} project{allActiveProjects !== 1 ? 's' : ''}
              </Badge>
            )}
            {stakeholder.followUps.length > 0 && (
              <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {stakeholder.followUps.length} follow-up{stakeholder.followUps.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Projects preview */}
        {activeProjects.length > 0 && (
          <div className="mt-3">
            <button
              onClick={e => { e.stopPropagation(); setShowProjects(v => !v); }}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <FolderOpen size={11} />
              {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}
              {showProjects ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            {showProjects && (
              <ul className="mt-2 space-y-1.5">
                {activeProjects.map(p => {
                  const st = STATUS_CONFIG[p.status];
                  return (
                    <li key={p.id} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)} />
                      <span className="truncate">{p.title}</span>
                      <span className={cn('shrink-0', st.text)}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Follow-ups preview */}
        {stakeholder.followUps.length > 0 && !showProjects && (
          <div className="mt-2 space-y-1">
            {stakeholder.followUps.slice(0, 2).map(f => (
              <div key={f.id} className="flex items-center gap-2 text-xs text-zinc-500">
                <CheckCircle2 size={11} className="text-amber-400 flex-shrink-0" />
                <span className="truncate">{f.description}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClick} className="mt-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          Open →
        </button>
      </CardBody>
    </Card>
  );
}
