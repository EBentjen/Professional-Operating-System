import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stakeholders = db.prepare('SELECT * FROM stakeholders ORDER BY tier ASC, name ASC').all();
    return NextResponse.json({ data: stakeholders });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { name, title, tier, notes } = await req.json();
    const result = db.prepare(
      'INSERT INTO stakeholders (name, title, tier, notes) VALUES (?, ?, ?, ?)'
    ).run(name, title || null, tier || 'secondary', notes || null);
    return NextResponse.json({ data: db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(result.lastInsertRowid) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { id, ...fields } = body;
    const allowed = ['name', 'title', 'tier', 'notes'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    const values = updates.map(([, v]) => v);
    db.prepare(`UPDATE stakeholders SET ${setClauses} WHERE id = ?`).run(...values, id);
    return NextResponse.json({ data: db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(id) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    db.prepare('DELETE FROM stakeholders WHERE id = ?').run(id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
