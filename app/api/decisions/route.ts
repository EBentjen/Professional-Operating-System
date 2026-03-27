import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM decisions ORDER BY date DESC, created_at DESC').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, context = '', decision, rationale = '', alternatives = '', stakeholders = '[]', outcome = '', tags = '', date } = body;
  if (!title?.trim() || !decision?.trim()) return NextResponse.json({ error: 'Title and decision required' }, { status: 400 });
  const result = db.prepare(
    'INSERT INTO decisions (title, context, decision, rationale, alternatives, stakeholders, outcome, tags, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title.trim(), context, decision.trim(), rationale, alternatives, stakeholders, outcome, tags, date || new Date().toISOString().slice(0, 10));
  return NextResponse.json(db.prepare('SELECT * FROM decisions WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'context', 'decision', 'rationale', 'alternatives', 'stakeholders', 'outcome', 'tags', 'date'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => v);
  db.prepare(`UPDATE decisions SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  return NextResponse.json(db.prepare('SELECT * FROM decisions WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM decisions WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
