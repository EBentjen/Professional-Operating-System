import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*, s.name as stakeholder_name
    FROM projects p
    LEFT JOIN stakeholders s ON s.id = p.stakeholder_id
    ORDER BY
      CASE p.status
        WHEN 'in_progress' THEN 1
        WHEN 'blocked'     THEN 2
        WHEN 'not_started' THEN 3
        WHEN 'done'        THEN 4
        ELSE 5
      END,
      p.updated_at DESC
  `).all();

  const db2 = getDb();
  const withItems = (rows as Record<string, unknown>[]).map(p => ({
    ...p,
    items: db2.prepare('SELECT * FROM project_items WHERE project_id = ? ORDER BY order_index, created_at').all(p.id as number),
  }));

  return NextResponse.json(withItems);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { title, status = 'not_started', notes = '', stakeholder_id = null, due_date = null } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const result = db.prepare(
    `INSERT INTO projects (title, status, notes, stakeholder_id, due_date) VALUES (?, ?, ?, ?, ?)`
  ).run(title.trim(), status, notes, stakeholder_id || null, due_date || null);
  const row = db.prepare(`SELECT p.*, s.name as stakeholder_name FROM projects p LEFT JOIN stakeholders s ON s.id = p.stakeholder_id WHERE p.id = ?`).get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'status', 'notes', 'stakeholder_id', 'due_date'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE projects SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...updates.map(([, v]) => v), id);
  const row = db.prepare(`SELECT p.*, s.name as stakeholder_name FROM projects p LEFT JOIN stakeholders s ON s.id = p.stakeholder_id WHERE p.id = ?`).get(id);
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
