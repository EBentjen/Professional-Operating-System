import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import type { SearchResult } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const db = getDb();
  const like = `%${q}%`;
  const results: SearchResult[] = [];

  const priorities = db.prepare(
    `SELECT p.id, p.title, p.outcome, p.created_at FROM priorities p
     WHERE p.title LIKE ? OR p.outcome LIKE ? OR p.why_it_matters LIKE ? LIMIT 5`
  ).all(like, like, like) as { id: number; title: string; outcome: string; created_at: string }[];
  for (const r of priorities) {
    results.push({ type: 'priority', id: r.id, title: r.title, excerpt: r.outcome, date: r.created_at, href: '/weekly' });
  }

  const decisions = db.prepare(
    `SELECT id, title, decision, date FROM decisions WHERE title LIKE ? OR decision LIKE ? OR context LIKE ? LIMIT 5`
  ).all(like, like, like) as { id: number; title: string; decision: string; date: string }[];
  for (const r of decisions) {
    results.push({ type: 'decision', id: r.id, title: r.title, excerpt: r.decision, date: r.date, href: '/decisions' });
  }

  const wins = db.prepare(
    `SELECT id, title, description, date FROM wins WHERE title LIKE ? OR description LIKE ? OR impact LIKE ? LIMIT 5`
  ).all(like, like, like) as { id: number; title: string; description: string; date: string }[];
  for (const r of wins) {
    results.push({ type: 'win', id: r.id, title: r.title, excerpt: r.description, date: r.date, href: '/wins' });
  }

  const learnings = db.prepare(
    `SELECT id, title, key_takeaway, date FROM learnings WHERE title LIKE ? OR key_takeaway LIKE ? OR source LIKE ? LIMIT 5`
  ).all(like, like, like) as { id: number; title: string; key_takeaway: string; date: string }[];
  for (const r of learnings) {
    results.push({ type: 'learning', id: r.id, title: r.title, excerpt: r.key_takeaway, date: r.date, href: '/learning' });
  }

  const captures = db.prepare(
    `SELECT id, content, created_at FROM captures WHERE content LIKE ? AND status != 'archived' LIMIT 5`
  ).all(like) as { id: number; content: string; created_at: string }[];
  for (const r of captures) {
    results.push({ type: 'capture', id: r.id, title: r.content.slice(0, 60), excerpt: r.content, date: r.created_at, href: '/capture' });
  }

  const oneOnOnes = db.prepare(
    `SELECT id, stakeholder_name, notes, date FROM one_on_ones WHERE stakeholder_name LIKE ? OR notes LIKE ? OR themes LIKE ? LIMIT 5`
  ).all(like, like, like) as { id: number; stakeholder_name: string; notes: string; date: string }[];
  for (const r of oneOnOnes) {
    results.push({ type: 'one_on_one', id: r.id, title: `1:1 with ${r.stakeholder_name}`, excerpt: r.notes || r.stakeholder_name, date: r.date, href: '/one-on-ones' });
  }

  const templates = db.prepare(
    `SELECT id, title, description, created_at FROM templates WHERE title LIKE ? OR description LIKE ? OR content LIKE ? LIMIT 5`
  ).all(like, like, like) as { id: number; title: string; description: string; created_at: string }[];
  for (const r of templates) {
    results.push({ type: 'template', id: r.id, title: r.title, excerpt: r.description, date: r.created_at, href: '/templates' });
  }

  return NextResponse.json(results);
}
