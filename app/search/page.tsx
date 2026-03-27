'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { cn, formatDate } from '@/lib/utils';
import type { SearchResult } from '@/lib/types';

const TYPE_CONFIG: Record<SearchResult['type'], { label: string; color: string }> = {
  priority: { label: 'Priority', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  decision: { label: 'Decision', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  win: { label: 'Win', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  learning: { label: 'Learning', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  capture: { label: 'Capture', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  one_on_one: { label: '1:1', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  template: { label: 'Template', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  stakeholder: { label: 'Person', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setResults(await res.json());
    setLoading(false);
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Search</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Search across priorities, decisions, wins, learnings, and more</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search everything..."
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
        )}
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          {results.map((r, i) => {
            const config = TYPE_CONFIG[r.type];
            return (
              <Link key={`${r.type}-${r.id}-${i}`} href={r.href}>
                <Card hoverable className="group">
                  <CardBody className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', config.color)}>{config.label}</span>
                          <span className="text-xs text-zinc-400">{formatDate(r.date)}</span>
                        </div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{r.title}</p>
                        {r.excerpt && r.excerpt !== r.title && (
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{r.excerpt}</p>
                        )}
                      </div>
                      <ArrowRight size={14} className="text-zinc-300 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0 mt-1" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!searched && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Decisions', href: '/decisions', desc: 'Key choices & rationale' },
            { label: 'Wins', href: '/wins', desc: 'Achievements & impact' },
            { label: 'Learnings', href: '/learning', desc: 'Books, articles, ideas' },
            { label: '1:1 Notes', href: '/one-on-ones', desc: 'Meeting notes & commitments' },
          ].map(item => (
            <Link key={item.href} href={item.href}>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
