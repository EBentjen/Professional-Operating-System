'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, Lightbulb, ChevronDown, ChevronUp, Trash2, Copy, Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateFull } from '@/lib/utils';
import type { Insight, Priority, Week } from '@/lib/types';

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [week, setWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    priority_id: '',
    key_question: '',
    takeaway: '',
    recommendation: '',
    executive_summary: '',
    talking_point_1: '',
    talking_point_2: '',
    talking_point_3: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, iRes] = await Promise.all([
        fetch('/api/weeks?current=true'),
        fetch('/api/insights'),
      ]);
      const wData = await wRes.json();
      const iData = await iRes.json();
      setWeek(wData.data);
      setInsights(iData.data);

      if (wData.data) {
        const pRes = await fetch(`/api/priorities?week_id=${wData.data.id}`);
        const pData = await pRes.json();
        setPriorities(pData.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveInsight() {
    const talking_points = [form.talking_point_1, form.talking_point_2, form.talking_point_3].filter(Boolean);
    await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priority_id: form.priority_id ? Number(form.priority_id) : null,
        week_id: week?.id || null,
        key_question: form.key_question,
        takeaway: form.takeaway,
        recommendation: form.recommendation,
        executive_summary: form.executive_summary || null,
        talking_points: talking_points.length ? talking_points : null,
      }),
    });
    setAddOpen(false);
    setForm({ priority_id: '', key_question: '', takeaway: '', recommendation: '', executive_summary: '', talking_point_1: '', talking_point_2: '', talking_point_3: '' });
    load();
  }

  async function deleteInsight(id: number) {
    await fetch(`/api/insights?id=${id}`, { method: 'DELETE' });
    load();
  }

  function copyExecSummary(insight: Insight) {
    const talking_points = insight.talking_points ? JSON.parse(insight.talking_points) : [];
    const text = [
      `QUESTION: ${insight.key_question}`,
      '',
      `TAKEAWAY: ${insight.takeaway}`,
      '',
      `RECOMMENDATION: ${insight.recommendation}`,
      insight.executive_summary ? `\nSUMMARY:\n${insight.executive_summary}` : '',
      talking_points.length ? `\nTALKING POINTS:\n${talking_points.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(insight.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw size={20} className="animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Insights & Outputs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Structured thinking for your key initiatives</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> New Insight
        </Button>
      </div>

      {/* Framework reminder */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">The Framework</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">1. Question</p>
            <p className="text-zinc-500 text-xs mt-0.5">What decision or problem are you solving?</p>
          </div>
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">2. Takeaway</p>
            <p className="text-zinc-500 text-xs mt-0.5">What does the data say? One clear answer.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">3. Recommendation</p>
            <p className="text-zinc-500 text-xs mt-0.5">What should be done, by whom, by when?</p>
          </div>
        </div>
      </div>

      {/* Insights List */}
      {insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No insights captured yet"
          description="Use this to structure your thinking before key meetings, presentations, or stakeholder conversations."
          action={<Button onClick={() => setAddOpen(true)}>Create First Insight</Button>}
        />
      ) : (
        <div className="space-y-3">
          {insights.map(insight => {
            const expanded = expandedId === insight.id;
            const talkingPoints = insight.talking_points ? JSON.parse(insight.talking_points) as string[] : [];

            return (
              <Card key={insight.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {insight.priority_title && (
                          <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                            {insight.priority_title}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">{formatDateFull(insight.created_at)}</span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Question</p>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">{insight.key_question}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => copyExecSummary(insight)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedId === insight.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                      </button>
                      <button
                        onClick={() => setExpandedId(expanded ? null : insight.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>
                </CardHeader>

                {expanded && (
                  <CardBody className="pt-0 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-4 pt-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Takeaway</p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{insight.takeaway}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Recommendation</p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{insight.recommendation}</p>
                      </div>
                      {insight.executive_summary && (
                        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Executive Summary</p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{insight.executive_summary}</p>
                        </div>
                      )}
                      {talkingPoints.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Talking Points</p>
                          <ul className="space-y-1.5">
                            {talkingPoints.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <span className="font-medium text-zinc-400 flex-shrink-0">{i + 1}.</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                        <button
                          onClick={() => deleteInsight(insight.id)}
                          className="text-xs text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  </CardBody>
                )}

                {/* Collapsed summary */}
                {!expanded && (
                  <CardBody className="pt-0">
                    <div className="flex gap-6">
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Takeaway</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{insight.takeaway}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Recommendation</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{insight.recommendation}</p>
                      </div>
                    </div>
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Insight Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Insight" size="lg">
        <div className="space-y-4">
          <Select
            label="Related Priority"
            value={form.priority_id}
            onChange={e => setForm(f => ({ ...f, priority_id: e.target.value }))}
          >
            <option value="">Not linked to a priority</option>
            {priorities.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </Select>

          <Input
            label="Key Question *"
            placeholder="What specific question does this analysis answer?"
            value={form.key_question}
            onChange={e => setForm(f => ({ ...f, key_question: e.target.value }))}
          />

          <Textarea
            label="Takeaway *"
            placeholder="What does the data/analysis tell you? One clear, direct answer."
            value={form.takeaway}
            onChange={e => setForm(f => ({ ...f, takeaway: e.target.value }))}
            rows={3}
          />

          <Textarea
            label="Recommendation *"
            placeholder="What should happen? Who needs to act? By when?"
            value={form.recommendation}
            onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
            rows={3}
          />

          <Textarea
            label="Executive Summary (optional)"
            placeholder="CFO-ready 2–3 sentence summary for a busy executive..."
            value={form.executive_summary}
            onChange={e => setForm(f => ({ ...f, executive_summary: e.target.value }))}
            rows={3}
          />

          <div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
              Talking Points (optional)
            </p>
            <div className="space-y-2">
              {[1, 2, 3].map(n => (
                <Input
                  key={n}
                  placeholder={`Talking point ${n}`}
                  value={form[`talking_point_${n}` as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [`talking_point_${n}`]: e.target.value }))}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={saveInsight}
              disabled={!form.key_question || !form.takeaway || !form.recommendation}
              className="flex-1"
            >
              Save Insight
            </Button>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
