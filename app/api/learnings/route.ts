import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM learnings ORDER BY date DESC, created_at DESC').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, source = '', source_type = 'article', key_takeaway = '', action_item = '', tags = '', date } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const result = db.prepare(
    'INSERT INTO learnings (title, source, source_type, key_takeaway, action_item, tags, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title.trim(), source, source_type, key_takeaway, action_item, tags, date || new Date().toISOString().slice(0, 10));
  return NextResponse.json(db.prepare('SELECT * FROM learnings WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'source', 'source_type', 'key_takeaway', 'action_item', 'tags', 'date'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE learnings SET ${setClauses} WHERE id = ?`).run(...updates.map(([, v]) => v), id);
  return NextResponse.json(db.prepare('SELECT * FROM learnings WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM learnings WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
