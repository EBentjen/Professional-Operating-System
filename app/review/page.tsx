'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, BarChart2, Save, CheckCircle2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatWeekRange, cn } from '@/lib/utils';
import type { Week, Priority, WeeklyReview } from '@/lib/types';

interface ReviewStats {
  total: number;
  done: number;
  slipped: number;
  blocked: number;
  notStarted: number;
}

export default function ReviewPage() {
  const [week, setWeek] = useState<Week | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    accomplished: '',
    slipped: '',
    time_analysis: '',
    patterns: '',
    next_week_focus: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wRes = await fetch('/api/weeks?current=true');
      const wData = await wRes.json();
      const currentWeek: Week = wData.data;
      setWeek(currentWeek);

      const [pRes, rRes] = await Promise.all([
        fetch(`/api/priorities?week_id=${currentWeek.id}`),
        fetch(`/api/review?week_id=${currentWeek.id}`),
      ]);
      const pData = await pRes.json();
      const rData = await rRes.json();

      setPriorities(pData.data);

      if (rData.data) {
        setReview(rData.data);
        setForm({
          accomplished: rData.data.accomplished,
          slipped: rData.data.slipped,
          time_analysis: rData.data.time_analysis,
          patterns: rData.data.patterns,
          next_week_focus: rData.data.next_week_focus,
        });
      } else {
        // Auto-generate initial content from priorities
        const done = pData.data.filter((p: Priority) => p.status === 'done');
        const slipped = pData.data.filter((p: Priority) => p.status !== 'done' && p.status !== 'in_progress');
        setForm(f => ({
          ...f,
          accomplished: done.map((p: Priority) => `• ${p.title}`).join('\n'),
          slipped: slipped.map((p: Priority) => `• ${p.title} (${p.status.replace('_', ' ')})`).join('\n'),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveReview() {
    if (!week) return;
    await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_id: week.id, ...form }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw size={20} className="animate-spin text-zinc-400" /></div>;
  }

  const stats: ReviewStats = {
    total: priorities.length,
    done: priorities.filter(p => p.status === 'done').length,
    slipped: priorities.filter(p => p.status === 'not_started').length,
    blocked: priorities.filter(p => p.status === 'blocked').length,
    notStarted: priorities.filter(p => p.status === 'not_started').length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Weekly Review</h1>
          {week && (
            <p className="text-sm text-zinc-500 mt-0.5">{formatWeekRange(week.week_start, week.week_end)}</p>
          )}
        </div>
        <Button onClick={saveReview}>
          {saved ? <><CheckCircle2 size={16} className="text-emerald-400" /> Saved</> : <><Save size={16} /> Save Review</>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Priorities" value={stats.total} />
        <StatCard label="Completed" value={stats.done} color="emerald" />
        <StatCard label="Blocked" value={stats.blocked} color="red" />
        <StatCard label="Not Started" value={stats.notStarted} color="amber" />
      </div>

      {/* Completion rate */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Weekly Completion</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{completionRate}%</p>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                completionRate >= 80 ? 'bg-emerald-500' :
                completionRate >= 50 ? 'bg-blue-500' : 'bg-amber-500'
              )}
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">
            {completionRate >= 80 ? 'Strong week. Consistent execution.' :
             completionRate >= 50 ? 'Decent progress. Investigate what slipped.' :
             'Below target. What pulled you off course?'}
          </p>
        </CardBody>
      </Card>

      {/* Priority Outcomes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Priority Outcomes</h2>
          </div>
        </CardHeader>
        <CardBody className="pt-0 space-y-2">
          {priorities.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No priorities were set for this week.</p>
          ) : (
            priorities.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 min-w-0 truncate">{p.title}</p>
                <StatusBadge status={p.status} />
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Review Form */}
      <div className="space-y-4">
        <ReviewSection
          title="What I Accomplished"
          hint="Be specific. Outcomes, not activities."
          placeholder="• Board deck delivered and approved&#10;• Revenue model rebuilt with new assumptions&#10;• Closed Q3 headcount planning"
          value={form.accomplished}
          onChange={v => setForm(f => ({ ...f, accomplished: v }))}
        />
        <ReviewSection
          title="What Slipped"
          hint="Be honest. No spin."
          placeholder="• VP Sales budget review — got pushed&#10;• Didn't finish the variance analysis"
          value={form.slipped}
          onChange={v => setForm(f => ({ ...f, slipped: v }))}
        />
        <ReviewSection
          title="Where Did Time Actually Go?"
          hint="Reactive vs proactive? Meetings vs deep work?"
          placeholder="• 60% in meetings — mostly reactive&#10;• Only 2 hours of uninterrupted analysis&#10;• Too much time firefighting on X issue"
          value={form.time_analysis}
          onChange={v => setForm(f => ({ ...f, time_analysis: v }))}
        />
        <ReviewSection
          title="Patterns & Lessons"
          hint="What should change next week?"
          placeholder="• Keep slipping on modeling when meeting load is high — need to block time&#10;• Reactive asks from VP Sales are displacing strategic work"
          value={form.patterns}
          onChange={v => setForm(f => ({ ...f, patterns: v }))}
        />
        <ReviewSection
          title="Next Week Focus"
          hint="What are the 1–2 things that must happen next week?"
          placeholder="• Complete Q4 forecast for board review&#10;• Finalize headcount model with HR"
          value={form.next_week_focus}
          onChange={v => setForm(f => ({ ...f, next_week_focus: v }))}
        />
      </div>

      <Button onClick={saveReview} className="w-full">
        {saved ? <><CheckCircle2 size={16} className="text-emerald-400" /> Saved</> : <><Save size={16} /> Save Review</>}
      </Button>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'emerald' | 'red' | 'amber' }) {
  return (
    <Card>
      <CardBody className="py-4 text-center">
        <p className={cn(
          'text-2xl font-bold',
          color === 'emerald' ? 'text-emerald-600' :
          color === 'red' ? 'text-red-600' :
          color === 'amber' ? 'text-amber-600' :
          'text-zinc-900 dark:text-zinc-100'
        )}>
          {value}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </CardBody>
    </Card>
  );
}

function ReviewSection({
  title, hint, placeholder, value, onChange
}: {
  title: string; hint: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>
      </CardHeader>
      <CardBody className="pt-0">
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
        />
      </CardBody>
    </Card>
  );
}
