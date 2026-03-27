import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { priority_id, title, due_date, notes } = await req.json();
    const result = db.prepare(
      'INSERT INTO deliverables (priority_id, title, due_date, notes) VALUES (?, ?, ?, ?)'
    ).run(priority_id, title, due_date || null, notes || null);
    const deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ data: deliverable }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { id, ...fields } = body;
    const allowed = ['title', 'due_date', 'status', 'notes'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    const values = updates.map(([, v]) => v);
    db.prepare(`UPDATE deliverables SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
    return NextResponse.json({ data: db.prepare('SELECT * FROM deliverables WHERE id = ?').get(id) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    db.prepare('DELETE FROM deliverables WHERE id = ?').run(id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
