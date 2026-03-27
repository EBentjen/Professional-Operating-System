'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Copy, Check, FileText } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function WeeklyBriefPage() {
  const [brief, setBrief] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/weekly-brief');
    const data = await res.json();
    setBrief(data.brief || '');
    setWeekStart(data.weekStart || '');
    setWeekEnd(data.weekEnd || '');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function copy() {
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Weekly Brief</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {weekStart && weekEnd ? `${weekStart} → ${weekEnd}` : 'Auto-generated from your data'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button variant="secondary" onClick={copy} disabled={!brief}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-3 text-xs text-zinc-500">
        This brief is automatically assembled from your priorities, follow-ups, wins, and decisions for the current week. Copy and paste into Slack, email, or a doc.
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <RefreshCw size={24} className="animate-spin" />
        </div>
      ) : brief ? (
        <Card>
          <CardBody>
            <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
              {brief}
            </pre>
          </CardBody>
        </Card>
      ) : (
        <div className="text-center py-12 text-zinc-400">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No data yet — add priorities and wins to generate your brief</p>
        </div>
      )}
    </div>
  );
}
