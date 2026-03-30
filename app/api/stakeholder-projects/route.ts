import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const stakeholder_id = req.nextUrl.searchParams.get('stakeholder_id');
  const rows = stakeholder_id
    ? db.prepare('SELECT * FROM stakeholder_projects WHERE stakeholder_id = ? ORDER BY status, created_at').all(Number(stakeholder_id))
    : db.prepare('SELECT * FROM stakeholder_projects ORDER BY stakeholder_id, status, created_at').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { stakeholder_id, title, status = 'not_started', notes = '' } = await req.json();
  if (!stakeholder_id || !title?.trim()) return NextResponse.json({ error: 'stakeholder_id and title required' }, { status: 400 });
  const result = db.prepare(
    'INSERT INTO stakeholder_projects (stakeholder_id, title, status, notes) VALUES (?, ?, ?, ?)'
  ).run(stakeholder_id, title.trim(), status, notes);
  return NextResponse.json(db.prepare('SELECT * FROM stakeholder_projects WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'status', 'notes'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE stakeholder_projects SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...updates.map(([, v]) => v), id);
  return NextResponse.json(db.prepare('SELECT * FROM stakeholder_projects WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM stakeholder_projects WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
