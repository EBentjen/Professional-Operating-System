'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Clock, Plus, RefreshCw, Users, Zap } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge, ImpactBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatWeekRange, cn, STATUS_DOT } from '@/lib/utils';
import type { DashboardSummary, Priority, FollowUp, DailyFocus, Deliverable } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleFocus(item: DailyFocus) {
    await fetch('/api/daily-focus', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_complete: !item.is_complete }),
    });
    load();
  }

  async function toggleFollowUp(item: FollowUp) {
    await fetch('/api/follow-ups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_complete: !item.is_complete }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!data) return null;

  const { currentWeek, priorities, atRisk, todayFocus, pendingFollowUps, overdueDeliverables } = data;
  const donePriorities = priorities.filter(p => p.status === 'done').length;
  const inProgressPriorities = priorities.filter(p => p.status === 'in_progress').length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">{today}</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {currentWeek?.theme || 'Dashboard'}
          </h1>
          {currentWeek && (
            <p className="text-sm text-zinc-500 mt-0.5">
              {formatWeekRange(currentWeek.week_start, currentWeek.week_end)}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Alert: At Risk */}
      {atRisk.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              {atRisk.length} {atRisk.length === 1 ? 'Priority' : 'Priorities'} At Risk
            </span>
          </div>
          <div className="space-y-1">
            {atRisk.map((p: Priority) => (
              <div key={p.id} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="font-medium">{p.title}</span>
                {p.status === 'blocked' && (
                  <span className="text-red-500">— Blocked: {p.blocked_reason || 'reason unknown'}</span>
                )}
                {p.deadline && p.status !== 'done' && p.deadline < new Date().toISOString().split('T')[0] && (
                  <span className="text-red-500">— Deadline was {formatDate(p.deadline)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{priorities.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Priorities</p>
          </CardBody>
        </Card>
        <Card className="text-center">
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-blue-600">{inProgressPriorities}</p>
            <p className="text-xs text-zinc-500 mt-0.5">In Progress</p>
          </CardBody>
        </Card>
        <Card className="text-center">
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-emerald-600">{donePriorities}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Done</p>
          </CardBody>
        </Card>
      </div>

      {/* Today's Focus */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Today&apos;s Focus</h2>
            </div>
            <Link href="/daily">
              <Button variant="ghost" size="sm">
                <Plus size={14} /> Add
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {todayFocus.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No focus set for today"
              description="Set 1–3 high-impact items to guide your day."
              action={<Link href="/daily"><Button size="sm">Set Daily Focus</Button></Link>}
            />
          ) : (
            <ul className="space-y-2">
              {todayFocus.map((item: DailyFocus) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 group cursor-pointer"
                  onClick={() => toggleFocus(item)}
                >
                  <button className="mt-0.5 flex-shrink-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                    {item.is_complete ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <div className={cn('flex-1 min-w-0', item.is_complete && 'opacity-50')}>
                    <p className={cn('text-sm font-medium', item.is_complete && 'line-through text-zinc-400')}>
                      {item.title}
                    </p>
                    {item.priority_title && (
                      <p className="text-xs text-zinc-500 mt-0.5">← {item.priority_title}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Weekly Priorities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Weekly Priorities</h2>
            <Link href="/weekly">
              <Button variant="ghost" size="sm">
                View all <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody className="pt-0 space-y-2">
          {priorities.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No priorities set for this week"
              description="Define your top 3–5 outcomes before the week escapes you."
              action={<Link href="/weekly"><Button size="sm">Set Priorities</Button></Link>}
            />
          ) : (
            priorities.map((p: Priority) => (
              <Link key={p.id} href="/weekly" className="block">
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', STATUS_DOT[p.status])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">{p.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <ImpactBadge impact={p.impact} />
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{p.outcome}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {p.deadline && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(p.deadline)}
                        </span>
                      )}
                      {p.stakeholders && p.stakeholders.length > 0 && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <Users size={11} />
                          {p.stakeholders.map(s => s.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardBody>
      </Card>

      {/* Overdue Deliverables */}
      {overdueDeliverables.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-orange-800 dark:text-orange-300">Overdue Deliverables</h2>
              <Badge className="bg-orange-100 text-orange-700">{overdueDeliverables.length}</Badge>
            </div>
          </CardHeader>
          <CardBody className="pt-0 space-y-1.5">
            {(overdueDeliverables as Deliverable[]).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{d.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{d.priority_title}</span>
                  <span className="text-xs text-orange-600 font-medium">Due {formatDate(d.due_date)}</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Pending Follow-Ups */}
      {pendingFollowUps.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Follow-Ups Needed</h2>
                <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {pendingFollowUps.length}
                </Badge>
              </div>
              <Link href="/stakeholders">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="pt-0 space-y-2">
            {pendingFollowUps.slice(0, 5).map((f: FollowUp) => (
              <div key={f.id} className="flex items-start gap-3">
                <button
                  onClick={() => toggleFollowUp(f)}
                  className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                >
                  <Circle size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{f.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {f.stakeholder_name && (
                      <span className="text-xs text-zinc-500">→ {f.stakeholder_name}</span>
                    )}
                    {f.due_date && (
                      <span className={cn(
                        'text-xs font-medium',
                        f.due_date < new Date().toISOString().split('T')[0]
                          ? 'text-red-600'
                          : 'text-zinc-400'
                      )}>
                        Due {formatDate(f.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
