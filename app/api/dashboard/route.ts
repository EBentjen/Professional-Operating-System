import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getWeekStartISO, getWeekEndISO, todayISO } from '@/lib/utils';

export async function GET() {
  try {
    const db = getDb();
    const weekStart = getWeekStartISO();
    const weekEnd = getWeekEndISO();
    const today = todayISO();

    // Upsert current week
    let week = db.prepare('SELECT * FROM weeks WHERE week_start = ?').get(weekStart);
    if (!week) {
      const r = db.prepare('INSERT INTO weeks (week_start, week_end) VALUES (?, ?)').run(weekStart, weekEnd);
      week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(r.lastInsertRowid);
    }
    const weekRow = week as { id: number; week_start: string; week_end: string; theme: string | null; created_at: string; updated_at: string };

    // Priorities for this week with enrichment
    const priorities = db.prepare('SELECT * FROM priorities WHERE week_id = ? ORDER BY order_index ASC').all(weekRow.id);
    const enriched = (priorities as Record<string, unknown>[]).map((p) => {
      const deliverables = db.prepare('SELECT * FROM deliverables WHERE priority_id = ?').all(p.id as number);
      const stakeholders = db.prepare(`
        SELECT s.*, ps.relationship FROM stakeholders s
        JOIN priority_stakeholders ps ON ps.stakeholder_id = s.id
        WHERE ps.priority_id = ?
      `).all(p.id as number);
      return { ...p, deliverables, stakeholders };
    });

    // At-risk: blocked or overdue deadline, not done
    const atRisk = enriched.filter((p: Record<string, unknown>) =>
      p.status === 'blocked' ||
      (p.deadline && p.deadline < today && p.status !== 'done')
    );

    // Today's focus
    const todayFocus = db.prepare(`
      SELECT df.*, p.title as priority_title
      FROM daily_focus df
      LEFT JOIN priorities p ON p.id = df.priority_id
      WHERE df.focus_date = ?
      ORDER BY df.order_index ASC
    `).all(today);

    // Pending follow-ups (open, due today or overdue)
    const pendingFollowUps = db.prepare(`
      SELECT f.*, s.name as stakeholder_name, p.title as priority_title
      FROM follow_ups f
      LEFT JOIN stakeholders s ON s.id = f.stakeholder_id
      LEFT JOIN priorities p ON p.id = f.priority_id
      WHERE f.is_complete = 0
      ORDER BY f.due_date ASC NULLS LAST
    `).all();

    // Overdue deliverables
    const overdueDeliverables = db.prepare(`
      SELECT d.*, p.title as priority_title
      FROM deliverables d
      JOIN priorities p ON p.id = d.priority_id
      WHERE d.due_date < ? AND d.status != 'done' AND p.week_id = ?
    `).all(today, weekRow.id);

    return NextResponse.json({
      data: {
        currentWeek: weekRow,
        priorities: enriched,
        atRisk,
        todayFocus,
        pendingFollowUps,
        overdueDeliverables,
      }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
