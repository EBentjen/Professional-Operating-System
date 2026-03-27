'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, Users, CheckCircle2, Circle, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';
import type { Stakeholder, FollowUp, Priority } from '@/lib/types';

interface StakeholderWithContext extends Stakeholder {
  priorities: (Priority & { week_start?: string })[];
  followUps: FollowUp[];
}

export default function StakeholdersPage() {
  const [stakeholders, setStakeholders] = useState<StakeholderWithContext[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [currentPriorities, setCurrentPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStakeholderOpen, setAddStakeholderOpen] = useState(false);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<StakeholderWithContext | null>(null);

  const [stakeholderForm, setStakeholderForm] = useState({ name: '', title: '', tier: 'secondary', notes: '' });
  const [followUpForm, setFollowUpForm] = useState({ description: '', stakeholder_id: '', priority_id: '', due_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, fRes, wRes] = await Promise.all([
        fetch('/api/stakeholders'),
        fetch('/api/follow-ups?open=true'),
        fetch('/api/weeks?current=true'),
      ]);
      const sData = await sRes.json();
      const fData = await fRes.json();
      const wData = await wRes.json();

      const stakeholderList: Stakeholder[] = sData.data;
      const followUpList: FollowUp[] = fData.data;

      let priorities: Priority[] = [];
      if (wData.data) {
        const pRes = await fetch(`/api/priorities?week_id=${wData.data.id}`);
        const pData = await pRes.json();
        priorities = pData.data;
        setCurrentPriorities(priorities);
      }

      // Build enriched stakeholders
      const enriched: StakeholderWithContext[] = stakeholderList.map(s => ({
        ...s,
        priorities: priorities.filter(p => p.stakeholders?.some(ps => ps.id === s.id)),
        followUps: followUpList.filter(f => f.stakeholder_id === s.id),
      }));

      setStakeholders(enriched);
      setFollowUps(followUpList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addStakeholder() {
    if (!stakeholderForm.name) return;
    await fetch('/api/stakeholders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stakeholderForm),
    });
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
    await fetch('/api/follow-ups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_complete: true }),
    });
    load();
  }

  async function deleteFollowUp(id: number) {
    await fetch(`/api/follow-ups?id=${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw size={20} className="animate-spin text-zinc-400" /></div>;
  }

  const primaryStakeholders = stakeholders.filter(s => s.tier === 'primary');
  const secondaryStakeholders = stakeholders.filter(s => s.tier === 'secondary');
  const today = new Date().toISOString().split('T')[0];
  const overdueFollowUps = followUps.filter(f => f.due_date && f.due_date < today);
  const quietProjects = currentPriorities.filter(p => {
    const hasFollowUp = followUps.some(f => f.priority_id === p.id);
    return p.status === 'in_progress' && !hasFollowUp;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Stakeholders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Track asks, updates, and follow-ups</p>
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

      {/* Risk Alerts */}
      {overdueFollowUps.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              {overdueFollowUps.length} overdue follow-up{overdueFollowUps.length !== 1 ? 's' : ''}
            </span>
          </div>
          {overdueFollowUps.map(f => (
            <div key={f.id} className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {f.stakeholder_name && <span className="font-medium">{f.stakeholder_name}:</span>}
              <span>{f.description}</span>
              <span className="text-red-400">({formatDate(f.due_date)})</span>
            </div>
          ))}
        </div>
      )}

      {quietProjects.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Projects that have gone quiet</span>
          </div>
          {quietProjects.map(p => (
            <p key={p.id} className="text-sm text-amber-700 dark:text-amber-400">
              &ldquo;{p.title}&rdquo; — in progress but no active follow-ups
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
                <button
                  onClick={() => completeFollowUp(f.id)}
                  className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                >
                  <Circle size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{f.description}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {f.stakeholder_name && (
                      <span className="text-xs font-medium text-zinc-500">→ {f.stakeholder_name}</span>
                    )}
                    {f.priority_title && (
                      <span className="text-xs text-zinc-400">re: {f.priority_title}</span>
                    )}
                    {f.due_date && (
                      <span className={cn('text-xs font-medium', f.due_date < today ? 'text-red-600' : 'text-zinc-400')}>
                        Due {formatDate(f.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteFollowUp(f.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"
                >
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
              <StakeholderCard
                key={s.id}
                stakeholder={s}
                onClick={() => setSelectedStakeholder(s)}
              />
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
              <StakeholderCard
                key={s.id}
                stakeholder={s}
                onClick={() => setSelectedStakeholder(s)}
              />
            ))}
          </div>
        </div>
      )}

      {stakeholders.length === 0 && (
        <EmptyState
          icon={Users}
          title="No stakeholders yet"
          description="Add the people whose asks and updates you need to track."
          action={<Button onClick={() => setAddStakeholderOpen(true)}>Add Stakeholder</Button>}
        />
      )}

      {/* Stakeholder Detail Modal */}
      {selectedStakeholder && (
        <Modal
          open={!!selectedStakeholder}
          onClose={() => setSelectedStakeholder(null)}
          title={selectedStakeholder.name}
          size="md"
        >
          <div className="space-y-4">
            {selectedStakeholder.title && (
              <p className="text-sm text-zinc-500">{selectedStakeholder.title}</p>
            )}

            {selectedStakeholder.priorities.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Active Priorities</p>
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

            {selectedStakeholder.followUps.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Open Follow-Ups</p>
                <ul className="space-y-1.5">
                  {selectedStakeholder.followUps.map(f => (
                    <li key={f.id} className="flex items-start gap-2">
                      <button onClick={() => completeFollowUp(f.id)} className="text-zinc-400 hover:text-emerald-600 mt-0.5">
                        <Circle size={14} />
                      </button>
                      <span className="text-sm">{f.description}</span>
                      {f.due_date && <span className="text-xs text-zinc-400 ml-auto">{formatDate(f.due_date)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedStakeholder.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedStakeholder.notes}</p>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteStakeholder(selectedStakeholder.id)}
              >
                <Trash2 size={14} /> Remove
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Stakeholder Modal */}
      <Modal open={addStakeholderOpen} onClose={() => setAddStakeholderOpen(false)} title="Add Stakeholder">
        <div className="space-y-4">
          <Input
            label="Name *"
            placeholder="e.g. Sarah Chen"
            value={stakeholderForm.name}
            onChange={e => setStakeholderForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Title"
            placeholder="e.g. CFO"
            value={stakeholderForm.title}
            onChange={e => setStakeholderForm(f => ({ ...f, title: e.target.value }))}
          />
          <Select
            label="Tier"
            value={stakeholderForm.tier}
            onChange={e => setStakeholderForm(f => ({ ...f, tier: e.target.value }))}
          >
            <option value="primary">Primary (direct stakeholder)</option>
            <option value="secondary">Secondary (indirect)</option>
          </Select>
          <Textarea
            label="Notes"
            placeholder="Working style, preferences, context..."
            value={stakeholderForm.notes}
            onChange={e => setStakeholderForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex gap-3">
            <Button onClick={addStakeholder} disabled={!stakeholderForm.name} className="flex-1">Add</Button>
            <Button variant="secondary" onClick={() => setAddStakeholderOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Follow-Up Modal */}
      <Modal open={addFollowUpOpen} onClose={() => setAddFollowUpOpen(false)} title="Add Follow-Up">
        <div className="space-y-4">
          <Textarea
            label="What needs to happen? *"
            placeholder="e.g. Send updated budget model to CFO"
            value={followUpForm.description}
            onChange={e => setFollowUpForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
          />
          <Select
            label="Stakeholder"
            value={followUpForm.stakeholder_id}
            onChange={e => setFollowUpForm(f => ({ ...f, stakeholder_id: e.target.value }))}
          >
            <option value="">No specific person</option>
            {stakeholders.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.title ? `· ${s.title}` : ''}</option>
            ))}
          </Select>
          <Select
            label="Related Priority"
            value={followUpForm.priority_id}
            onChange={e => setFollowUpForm(f => ({ ...f, priority_id: e.target.value }))}
          >
            <option value="">Not linked to a priority</option>
            {currentPriorities.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </Select>
          <Input
            label="Due date"
            type="date"
            value={followUpForm.due_date}
            onChange={e => setFollowUpForm(f => ({ ...f, due_date: e.target.value }))}
          />
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
  const hasOpenFollowUps = stakeholder.followUps.length > 0;
  const activePriorities = stakeholder.priorities.filter(p => p.status !== 'done');

  return (
    <Card hoverable onClick={onClick} className="transition-all">
      <CardBody className="py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{stakeholder.name}</p>
            {stakeholder.title && (
              <p className="text-xs text-zinc-500 mt-0.5">{stakeholder.title}</p>
            )}
          </div>
          <div className="flex gap-1.5">
            {activePriorities.length > 0 && (
              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {activePriorities.length} active
              </Badge>
            )}
            {hasOpenFollowUps && (
              <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {stakeholder.followUps.length} follow-up{stakeholder.followUps.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {stakeholder.followUps.length > 0 && (
          <div className="mt-3 space-y-1">
            {stakeholder.followUps.slice(0, 2).map(f => (
              <div key={f.id} className="flex items-center gap-2 text-xs text-zinc-500">
                <CheckCircle2 size={11} className="text-amber-400 flex-shrink-0" />
                <span className="truncate">{f.description}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
