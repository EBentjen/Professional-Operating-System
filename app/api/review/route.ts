import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const weekId = searchParams.get('week_id');
    if (!weekId) return NextResponse.json({ error: 'week_id required' }, { status: 400 });

    const review = db.prepare('SELECT * FROM weekly_reviews WHERE week_id = ?').get(weekId);
    return NextResponse.json({ data: review || null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { week_id, accomplished, slipped, time_analysis, patterns, next_week_focus } = body;

    const existing = db.prepare('SELECT id FROM weekly_reviews WHERE week_id = ?').get(week_id);
    if (existing) {
      db.prepare(`
        UPDATE weekly_reviews
        SET accomplished = ?, slipped = ?, time_analysis = ?, patterns = ?, next_week_focus = ?, updated_at = datetime('now')
        WHERE week_id = ?
      `).run(accomplished, slipped, time_analysis, patterns, next_week_focus, week_id);
    } else {
      db.prepare(`
        INSERT INTO weekly_reviews (week_id, accomplished, slipped, time_analysis, patterns, next_week_focus)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(week_id, accomplished, slipped, time_analysis, patterns, next_week_focus);
    }

    const review = db.prepare('SELECT * FROM weekly_reviews WHERE week_id = ?').get(week_id);
    return NextResponse.json({ data: review });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
