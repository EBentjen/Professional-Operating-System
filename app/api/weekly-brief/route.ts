import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getWeekStartISO, getWeekEndISO } from '@/lib/utils';

export async function GET() {
  const db = getDb();
  const weekStart = getWeekStartISO();
  const weekEnd = getWeekEndISO();

  const week = db.prepare('SELECT * FROM weeks WHERE week_start = ?').get(weekStart) as { id: number; theme: string | null } | undefined;
  const weekId = week?.id;

  const priorities = weekId
    ? db.prepare('SELECT * FROM priorities WHERE week_id = ? ORDER BY order_index').all(weekId) as { id: number; title: string; status: string; impact: string; deadline: string | null }[]
    : [];

  const openFollowUps = db.prepare(
    `SELECT f.description, s.name as stakeholder_name FROM follow_ups f
     LEFT JOIN stakeholders s ON s.id = f.stakeholder_id
     WHERE f.is_complete = 0 AND (f.due_date IS NULL OR f.due_date <= ?)
     ORDER BY f.due_date ASC LIMIT 10`
  ).all(weekEnd) as { description: string; stakeholder_name: string | null }[];

  const recentWins = db.prepare(
    `SELECT title, metric FROM wins WHERE date >= ? ORDER BY date DESC LIMIT 5`
  ).all(weekStart) as { title: string; metric: string }[];

  const recentDecisions = db.prepare(
    `SELECT title, decision FROM decisions WHERE date >= ? ORDER BY date DESC LIMIT 5`
  ).all(weekStart) as { title: string; decision: string }[];

  const today = new Date().toISOString().slice(0, 10);
  const todayFocus = db.prepare(
    'SELECT title, is_complete FROM daily_focus WHERE focus_date = ? ORDER BY order_index'
  ).all(today) as { title: string; is_complete: number }[];

  const done = priorities.filter(p => p.status === 'done').length;
  const total = priorities.length;

  const lines: string[] = [];
  lines.push(`# Weekly Brief — ${weekStart} to ${weekEnd}`);
  if (week?.theme) lines.push(`**Theme:** ${week.theme}`);
  lines.push('');

  lines.push(`## Priority Status (${done}/${total} complete)`);
  for (const p of priorities) {
    const statusMark = p.status === 'done' ? '✅' : p.status === 'blocked' ? '🔴' : p.status === 'in_progress' ? '🟡' : '⬜';
    lines.push(`${statusMark} ${p.title}`);
  }
  lines.push('');

  if (todayFocus.length > 0) {
    lines.push(`## Today's Focus`);
    for (const f of todayFocus) {
      lines.push(`${f.is_complete ? '✅' : '⬜'} ${f.title}`);
    }
    lines.push('');
  }

  if (openFollowUps.length > 0) {
    lines.push('## Open Follow-Ups');
    for (const f of openFollowUps) {
      const who = f.stakeholder_name ? ` (${f.stakeholder_name})` : '';
      lines.push(`- ${f.description}${who}`);
    }
    lines.push('');
  }

  if (recentWins.length > 0) {
    lines.push('## Wins This Week');
    for (const w of recentWins) {
      lines.push(`- ${w.title}${w.metric ? ` — ${w.metric}` : ''}`);
    }
    lines.push('');
  }

  if (recentDecisions.length > 0) {
    lines.push('## Decisions Made');
    for (const d of recentDecisions) {
      lines.push(`- **${d.title}:** ${d.decision}`);
    }
    lines.push('');
  }

  return NextResponse.json({ brief: lines.join('\n'), weekStart, weekEnd });
}
