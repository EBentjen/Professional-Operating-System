import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM financial_events ORDER BY bd_day ASC, specific_date ASC').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, event_type = 'deadline', bd_day = null, specific_date = null, recurring = 'monthly', notes = '', color = 'zinc' } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const result = db.prepare(
    'INSERT INTO financial_events (title, event_type, bd_day, specific_date, recurring, notes, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title.trim(), event_type, bd_day, specific_date, recurring, notes, color);
  return NextResponse.json(db.prepare('SELECT * FROM financial_events WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'event_type', 'bd_day', 'specific_date', 'recurring', 'notes', 'color'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE financial_events SET ${setClauses} WHERE id = ?`).run(...updates.map(([, v]) => v), id);
  return NextResponse.json(db.prepare('SELECT * FROM financial_events WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM financial_events WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
