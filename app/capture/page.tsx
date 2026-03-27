'use client';

import { useEffect, useState, useCallback } from 'react';
import { Inbox, Archive, CheckCircle2, Trash2, RefreshCw, Tag } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatDate } from '@/lib/utils';
import type { Capture, CaptureStatus } from '@/lib/types';

const STATUS_TABS: { value: CaptureStatus | 'all'; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'processed', label: 'Processed' },
  { value: 'archived', label: 'Archived' },
];

export default function CapturePage() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [filter, setFilter] = useState<CaptureStatus | 'all'>('inbox');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const url = filter === 'all' ? '/api/captures' : `/api/captures?status=${filter}`;
    const res = await fetch(url);
    setCaptures(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: number, status: CaptureStatus) {
    await fetch('/api/captures', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  }

  async function deleteCapture(id: number) {
    await fetch('/api/captures', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  const inboxCount = captures.filter(c => c.status === 'inbox').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Capture Inbox</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Quick thoughts, ideas, and tasks waiting to be triaged</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* How-to hint */}
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-3 text-sm text-zinc-500">
        Use the <strong className="text-zinc-700 dark:text-zinc-300">+ Capture</strong> button (bottom-right on every page) to quickly dump anything. Triage here.
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              filter === t.value
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {t.label}
            {t.value === 'inbox' && inboxCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold">
                {inboxCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {captures.length === 0 && !loading ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'inbox' ? 'Inbox is clear' : 'Nothing here'}
          description={filter === 'inbox' ? 'Use the + Capture button to add something' : ''}
        />
      ) : (
        <div className="space-y-2">
          {captures.map(c => (
            <Card key={c.id}>
              <CardBody className="py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">{c.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-zinc-400">{formatDate(c.created_at)}</span>
                      {c.tags && c.tags.split(',').filter(Boolean).map(tag => (
                        <Badge key={tag} variant="default" className="text-[10px] py-0">
                          <Tag size={9} className="mr-0.5" />{tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.status === 'inbox' && (
                      <Button variant="secondary" size="sm" onClick={() => setStatus(c.id, 'processed')} title="Mark processed">
                        <CheckCircle2 size={13} />
                      </Button>
                    )}
                    {c.status !== 'archived' && (
                      <Button variant="secondary" size="sm" onClick={() => setStatus(c.id, 'archived')} title="Archive">
                        <Archive size={13} />
                      </Button>
                    )}
                    {c.status === 'archived' && (
                      <Button variant="secondary" size="sm" onClick={() => setStatus(c.id, 'inbox')} title="Move to inbox">
                        <Inbox size={13} />
                      </Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => deleteCapture(c.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
