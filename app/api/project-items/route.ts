import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  const db = getDb();
  const { project_id, title, due_date = null, order_index = 0 } = await req.json();
  if (!project_id || !title?.trim()) return NextResponse.json({ error: 'project_id and title required' }, { status: 400 });
  const result = db.prepare(
    'INSERT INTO project_items (project_id, title, due_date, order_index) VALUES (?, ?, ?, ?)'
  ).run(project_id, title.trim(), due_date, order_index);
  return NextResponse.json(db.prepare('SELECT * FROM project_items WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'is_complete', 'order_index', 'due_date'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE project_items SET ${setClauses} WHERE id = ?`).run(...updates.map(([, v]) => v), id);
  return NextResponse.json(db.prepare('SELECT * FROM project_items WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM project_items WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
