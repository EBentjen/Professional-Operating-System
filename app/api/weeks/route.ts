import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getWeekStartISO, getWeekEndISO } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const current = searchParams.get('current');

    if (current === 'true') {
      const weekStart = getWeekStartISO();
      let week = db.prepare('SELECT * FROM weeks WHERE week_start = ?').get(weekStart);
      if (!week) {
        const result = db.prepare(
          'INSERT INTO weeks (week_start, week_end) VALUES (?, ?)'
        ).run(weekStart, getWeekEndISO());
        week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(result.lastInsertRowid);
      }
      return NextResponse.json({ data: week });
    }

    const weeks = db.prepare('SELECT * FROM weeks ORDER BY week_start DESC LIMIT 12').all();
    return NextResponse.json({ data: weeks });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { id, theme } = body;
    db.prepare('UPDATE weeks SET theme = ?, updated_at = datetime(\'now\') WHERE id = ?').run(theme, id);
    const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(id);
    return NextResponse.json({ data: week });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
