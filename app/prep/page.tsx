'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Users, ClipboardList, FolderKanban, Target, MessageSquare, AlertCircle, Check, Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDate, cn } from '@/lib/utils';
import type { Stakeholder, FollowUp, OneOnOne, Project, StakeholderProject, Priority, Week } from '@/lib/types';

const PROJECT_STATUS_LABEL: Record<string, string> = {
  not_started: 'Not Started',
  in_progress:  'In Progress',
  in_review:    'In Review',
  blocked:      'Blocked',
  done:         'Done',
};
const PROJECT_STATUS_DOT: Record<string, string> = {
  not_started: 'bg-zinc-400',
  in_progress:  'bg-blue-500',
  in_review:    'bg-purple-500',
  blocked:      'bg-red-500',
  done:         'bg-emerald-500',
};

function parseList(json: string): string[] {
  try { return JSON.parse(json) || []; } catch { return []; }
}

interface PrepData {
  stakeholder: Stakeholder;
  followUps: FollowUp[];
  lastMeeting: OneOnOne | null;
  trackerProjects: Project[];
  stakeholderProjects: StakeholderProject[];
  sharedPriorities: Priority[];
}

export default function PrepPage() {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [prep, setPrep] = useState<PrepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ description: '', due_date: '' });

  // Load stakeholder list on mount
  useEffect(() => {
    fetch('/api/stakeholders')
      .then(r => r.json())
      .then(d => setStakeholders(d.data ?? []));
  }, []);

  const loadPrep = useCallback(async (stakeholderId: string) => {
    if (!stakeholderId) { setPrep(null); return; }
    setLoading(true);

    const sid = Number(stakeholderId);
    const stakeholder = stakeholders.find(s => s.id === sid);
    if (!stakeholder) { setLoading(false); return; }

    const [fuRes, meetRes, projRes, spRes, weekRes] = await Promise.all([
      fetch(`/api/follow-ups`),
      fetch(`/api/one-on-ones?stakeholder=${encodeURIComponent(stakeholder.name)}`),
      fetch(`/api/projects`),
      fetch(`/api/stakeholder-projects?stakeholder_id=${sid}`),
      fetch(`/api/weeks?current=true`),
    ]);

    const [fuData, meetData, projData, spData, weekData] = await Promise.all([
      fuRes.json(), meetRes.json(), projRes.json(), spRes.json(), weekRes.json(),
    ]);

    // Filter follow-ups for this stakeholder
    const allFollowUps: FollowUp[] = fuData.data ?? [];
    const followUps = allFollowUps.filter(f => f.stakeholder_id === sid && !f.is_complete);

    // Most recent 1:1
    const meetings: OneOnOne[] = Array.isArray(meetData) ? meetData : [];
    const lastMeeting = meetings.length > 0 ? meetings[0] : null;

    // Projects from tracker linked to this stakeholder
    const allProjects: Project[] = projData.data ?? [];
    const trackerProjects = allProjects.filter(p => p.stakeholder_id === sid && p.status !== 'done');

    // Stakeholder-specific projects
    const stakeholderProjects: StakeholderProject[] = Array.isArray(spData) ? spData : [];

    // Current week priorities tagged with this stakeholder
    const currentWeek: Week | null = weekData.data ?? null;
    let sharedPriorities: Priority[] = [];
    if (currentWeek) {
      const pRes = await fetch(`/api/priorities?week_id=${currentWeek.id}`);
      const pData = await pRes.json();
      const priorities: Priority[] = pData.data ?? [];
      sharedPriorities = priorities.filter(p =>
        p.stakeholders?.some(s => s.id === sid)
      );
    }

    setPrep({ stakeholder, followUps, lastMeeting, trackerProjects, stakeholderProjects, sharedPriorities });
    setLoading(false);
  }, [stakeholders]);

  async function addFollowUp() {
    if (!newFollowUp.description.trim() || !selectedId) return;
    await fetch('/api/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: newFollowUp.description.trim(),
        stakeholder_id: Number(selectedId),
        due_date: newFollowUp.due_date || null,
      }),
    });
    setNewFollowUp({ description: '', due_date: '' });
    setAddingFollowUp(false);
    loadPrep(selectedId);
  }

  const activeProjects = prep
    ? [...prep.trackerProjects, ...prep.stakeholderProjects.filter(sp => sp.status !== 'done')]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Meeting Prep</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Pull up everything you need before a meeting</p>
      </div>

      {/* Stakeholder selector */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Select
            label="Select stakeholder"
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
              loadPrep(e.target.value);
            }}
          >
            <option value="">Choose a person...</option>
            {stakeholders.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}{s.title ? ` · ${s.title}` : ''}
              </option>
            ))}
          </Select>
        </div>
        {selectedId && (
          <Button variant="secondary" size="sm" onClick={() => loadPrep(selectedId)}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <RefreshCw size={18} className="animate-spin text-zinc-400" />
        </div>
      )}

      {!loading && !prep && (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-12 text-center">
          <Users size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">Select a stakeholder to see their full context</p>
        </div>
      )}

      {!loading && prep && (
        <div className="space-y-5">
          {/* Person header */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-zinc-900/10 flex items-center justify-center text-lg font-bold">
              {prep.stakeholder.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">{prep.stakeholder.name}</p>
              {prep.stakeholder.title && <p className="text-sm opacity-60">{prep.stakeholder.title}</p>}
            </div>
            <Badge className={cn(
              'ml-auto text-xs',
              prep.stakeholder.tier === 'primary'
                ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                : 'bg-white/10 text-white/70 dark:bg-zinc-900/10 dark:text-zinc-900/70'
            )}>
              {prep.stakeholder.tier}
            </Badge>
          </div>

          {/* Open Follow-Ups */}
          <Section
            icon={<ClipboardList size={15} />}
            title="Open Follow-Ups"
            count={prep.followUps.length}
            emptyText="No open follow-ups with this person"
            action={
              <button
                onClick={() => setAddingFollowUp(v => !v)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            }
          >
            {addingFollowUp && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Follow-up description..."
                  value={newFollowUp.description}
                  onChange={e => setNewFollowUp(f => ({ ...f, description: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addFollowUp()}
                  className="flex-1"
                  autoFocus
                />
                <DatePicker
                  value={newFollowUp.due_date}
                  onChange={val => setNewFollowUp(f => ({ ...f, due_date: val }))}
                  className="w-40"
                />
                <Button size="sm" onClick={addFollowUp} disabled={!newFollowUp.description.trim()}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => setAddingFollowUp(false)}>Cancel</Button>
              </div>
            )}
            {prep.followUps.map(f => {
              const overdue = f.due_date && new Date(f.due_date + 'T00:00:00') < new Date(new Date().toDateString());
              return (
                <div key={f.id} className="flex items-start gap-2 text-sm py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600 flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{f.description}</span>
                  {f.due_date && (
                    <span className={cn('text-xs flex-shrink-0', overdue ? 'text-red-500 font-medium' : 'text-zinc-400')}>
                      {overdue && <AlertCircle size={11} className="inline mr-1" />}
                      {formatDate(f.due_date)}
                    </span>
                  )}
                </div>
              );
            })}
          </Section>

          {/* Last Meeting Notes */}
          <Section
            icon={<MessageSquare size={15} />}
            title="Last Meeting"
            count={prep.lastMeeting ? 1 : 0}
            emptyText="No 1:1 notes recorded yet"
          >
            {prep.lastMeeting && (
              <div className="space-y-3 text-sm">
                <p className="text-xs text-zinc-400 font-medium">{formatDate(prep.lastMeeting.date)}</p>
                {prep.lastMeeting.notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                    <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{prep.lastMeeting.notes}</p>
                  </div>
                )}
                {parseList(prep.lastMeeting.their_commitments).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Their Commitments</p>
                    <ul className="space-y-1">
                      {parseList(prep.lastMeeting.their_commitments).map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-zinc-700 dark:text-zinc-300">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {parseList(prep.lastMeeting.my_commitments).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">My Commitments</p>
                    <ul className="space-y-1">
                      {parseList(prep.lastMeeting.my_commitments).map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-zinc-700 dark:text-zinc-300">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {parseList(prep.lastMeeting.next_agenda).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Agenda Items Queued</p>
                    <ul className="space-y-1">
                      {parseList(prep.lastMeeting.next_agenda).map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">·</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Active Projects */}
          <Section
            icon={<FolderKanban size={15} />}
            title="Active Projects"
            count={activeProjects.length}
            emptyText="No active projects with this person"
          >
            {activeProjects.map((p, i) => {
              const isTracker = 'stakeholder_id' in p;
              const status = p.status as string;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', PROJECT_STATUS_DOT[status] || 'bg-zinc-400')} />
                  <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{p.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{PROJECT_STATUS_LABEL[status]}</span>
                    {isTracker && (p as Project).due_date && (
                      <span className="text-xs text-zinc-400">{formatDate((p as Project).due_date!)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </Section>

          {/* This Week's Shared Priorities */}
          <Section
            icon={<Target size={15} />}
            title="This Week's Shared Priorities"
            count={prep.sharedPriorities.length}
            emptyText="No current-week priorities tagged with this person"
          >
            {prep.sharedPriorities.map(p => (
              <div key={p.id} className="py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <div className="flex items-start gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
                    p.status === 'done' ? 'bg-emerald-500' :
                    p.status === 'blocked' ? 'bg-red-500' :
                    p.status === 'in_progress' ? 'bg-blue-500' : 'bg-zinc-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{p.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{p.outcome}</p>
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0 capitalize">{p.status.replace('_', ' ')}</span>
                </div>
                {p.status === 'blocked' && p.blocked_reason && (
                  <p className="text-xs text-red-500 mt-1 ml-4 flex items-center gap-1">
                    <AlertCircle size={11} /> {p.blocked_reason}
                  </p>
                )}
              </div>
            ))}
          </Section>

          {/* Personal notes from stakeholder record */}
          {prep.stakeholder.notes && (
            <Card>
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Background Notes</p>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{prep.stakeholder.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  emptyText,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  emptyText: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            {icon}
            <span className="text-sm font-semibold">{title}</span>
            {count > 0 && (
              <span className="text-xs text-zinc-400 font-normal">({count})</span>
            )}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        {count === 0 && !action ? (
          <p className="text-xs text-zinc-400 italic">{emptyText}</p>
        ) : count === 0 ? (
          <p className="text-xs text-zinc-400 italic mb-2">{emptyText}</p>
        ) : null}
        {children}
      </CardBody>
    </Card>
  );
}
