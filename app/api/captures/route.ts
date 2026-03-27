import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const query = status
    ? db.prepare('SELECT * FROM captures WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM captures ORDER BY created_at DESC').all();
  return NextResponse.json(query);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { content, tags = '' } = body;
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
  const result = db.prepare('INSERT INTO captures (content, tags) VALUES (?, ?)').run(content.trim(), tags);
  const row = db.prepare('SELECT * FROM captures WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, content, tags, status } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  db.prepare('UPDATE captures SET content = COALESCE(?, content), tags = COALESCE(?, tags), status = COALESCE(?, status) WHERE id = ?')
    .run(content ?? null, tags ?? null, status ?? null, id);
  return NextResponse.json(db.prepare('SELECT * FROM captures WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM captures WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
