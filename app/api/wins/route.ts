import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM wins ORDER BY date DESC, created_at DESC').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, description = '', impact = '', metric = '', category = 'general', date } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const result = db.prepare(
    'INSERT INTO wins (title, description, impact, metric, category, date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title.trim(), description, impact, metric, category, date || new Date().toISOString().slice(0, 10));
  return NextResponse.json(db.prepare('SELECT * FROM wins WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'description', 'impact', 'metric', 'category', 'date'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => v);
  db.prepare(`UPDATE wins SET ${setClauses} WHERE id = ?`).run(...values, id);
  return NextResponse.json(db.prepare('SELECT * FROM wins WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM wins WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
