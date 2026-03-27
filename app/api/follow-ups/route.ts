import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const open = searchParams.get('open');

    const query = `
      SELECT f.*, s.name as stakeholder_name, p.title as priority_title
      FROM follow_ups f
      LEFT JOIN stakeholders s ON s.id = f.stakeholder_id
      LEFT JOIN priorities p ON p.id = f.priority_id
      ${open === 'true' ? 'WHERE f.is_complete = 0' : ''}
      ORDER BY f.due_date ASC NULLS LAST, f.created_at DESC
    `;

    return NextResponse.json({ data: db.prepare(query).all() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { priority_id, stakeholder_id, description, due_date } = await req.json();
    const result = db.prepare(
      'INSERT INTO follow_ups (priority_id, stakeholder_id, description, due_date) VALUES (?, ?, ?, ?)'
    ).run(priority_id || null, stakeholder_id || null, description, due_date || null);

    const row = db.prepare(`
      SELECT f.*, s.name as stakeholder_name, p.title as priority_title
      FROM follow_ups f
      LEFT JOIN stakeholders s ON s.id = f.stakeholder_id
      LEFT JOIN priorities p ON p.id = f.priority_id
      WHERE f.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const { id, is_complete, description, due_date } = await req.json();
    const updates: [string, unknown][] = [];
    if (is_complete !== undefined) updates.push(['is_complete', is_complete ? 1 : 0]);
    if (description !== undefined) updates.push(['description', description]);
    if (due_date !== undefined) updates.push(['due_date', due_date]);

    if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    const values = updates.map(([, v]) => v);
    db.prepare(`UPDATE follow_ups SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);

    const row = db.prepare(`
      SELECT f.*, s.name as stakeholder_name, p.title as priority_title
      FROM follow_ups f
      LEFT JOIN stakeholders s ON s.id = f.stakeholder_id
      LEFT JOIN priorities p ON p.id = f.priority_id
      WHERE f.id = ?
    `).get(id);
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    db.prepare('DELETE FROM follow_ups WHERE id = ?').run(searchParams.get('id'));
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
