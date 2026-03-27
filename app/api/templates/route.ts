import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category');
  const rows = category
    ? db.prepare('SELECT * FROM templates WHERE category = ? ORDER BY title').all(category)
    : db.prepare('SELECT * FROM templates ORDER BY category, title').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, category = 'general', description = '', content, tags = '' } = body;
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
  const result = db.prepare(
    'INSERT INTO templates (title, category, description, content, tags) VALUES (?, ?, ?, ?, ?)'
  ).run(title.trim(), category, description, content.trim(), tags);
  return NextResponse.json(db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'category', 'description', 'content', 'tags'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE templates SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...updates.map(([, v]) => v), id);
  return NextResponse.json(db.prepare('SELECT * FROM templates WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
