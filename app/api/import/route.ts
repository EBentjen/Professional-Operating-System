import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

const TABLE_ORDER = [
  'weeks',
  'stakeholders',
  'priorities',
  'priority_stakeholders',
  'deliverables',
  'follow_ups',
  'daily_focus',
  'insights',
  'weekly_reviews',
  'captures',
  'decisions',
  'wins',
  'one_on_ones',
  'okrs',
  'key_results',
  'financial_events',
  'templates',
  'learnings',
];

export async function POST(req: NextRequest) {
  const db = getDb();

  let payload: { version: number; data: Record<string, Record<string, unknown>[]> };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.version !== 1 || !payload.data) {
    return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
  }

  const restore = db.transaction(() => {
    // Disable FK checks during restore
    db.pragma('foreign_keys = OFF');

    // Clear all tables in reverse order to avoid FK issues
    for (const table of [...TABLE_ORDER].reverse()) {
      db.prepare(`DELETE FROM ${table}`).run();
      // Reset autoincrement counters
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
    }

    // Re-insert all rows in dependency order
    for (const table of TABLE_ORDER) {
      const rows = payload.data[table];
      if (!rows || rows.length === 0) continue;

      // Build insert from first row's keys
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
      );

      for (const row of rows) {
        stmt.run(...cols.map(c => row[c]));
      }
    }

    db.pragma('foreign_keys = ON');
  });

  try {
    restore();
    return NextResponse.json({ ok: true, message: 'Data restored successfully' });
  } catch (err) {
    db.pragma('foreign_keys = ON');
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
