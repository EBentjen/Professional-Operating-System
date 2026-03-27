import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = req.nextUrl;
  const stakeholderName = searchParams.get('stakeholder');
  const rows = stakeholderName
    ? db.prepare('SELECT * FROM one_on_ones WHERE stakeholder_name = ? ORDER BY date DESC').all(stakeholderName)
    : db.prepare('SELECT * FROM one_on_ones ORDER BY date DESC').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const {
    stakeholder_id = null,
    stakeholder_name,
    date,
    agenda = '[]',
    notes = '',
    my_commitments = '[]',
    their_commitments = '[]',
    themes = '',
    next_agenda = '[]',
  } = body;
  if (!stakeholder_name?.trim() || !date) return NextResponse.json({ error: 'Name and date required' }, { status: 400 });
  const result = db.prepare(
    `INSERT INTO one_on_ones (stakeholder_id, stakeholder_name, date, agenda, notes, my_commitments, their_commitments, themes, next_agenda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(stakeholder_id, stakeholder_name.trim(), date, agenda, notes, my_commitments, their_commitments, themes, next_agenda);
  return NextResponse.json(db.prepare('SELECT * FROM one_on_ones WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['stakeholder_name', 'date', 'agenda', 'notes', 'my_commitments', 'their_commitments', 'themes', 'next_agenda'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => v);
  db.prepare(`UPDATE one_on_ones SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  return NextResponse.json(db.prepare('SELECT * FROM one_on_ones WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM one_on_ones WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
