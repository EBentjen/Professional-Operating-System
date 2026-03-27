import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const weekId = searchParams.get('week_id');
    const priorityId = searchParams.get('priority_id');

    let query = `
      SELECT i.*, p.title as priority_title
      FROM insights i
      LEFT JOIN priorities p ON p.id = i.priority_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (weekId) { query += ' AND i.week_id = ?'; params.push(weekId); }
    if (priorityId) { query += ' AND i.priority_id = ?'; params.push(priorityId); }
    query += ' ORDER BY i.created_at DESC';

    return NextResponse.json({ data: db.prepare(query).all(...params) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { priority_id, week_id, key_question, takeaway, recommendation, executive_summary, talking_points } = await req.json();

    const result = db.prepare(`
      INSERT INTO insights (priority_id, week_id, key_question, takeaway, recommendation, executive_summary, talking_points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      priority_id || null,
      week_id || null,
      key_question,
      takeaway,
      recommendation,
      executive_summary || null,
      talking_points ? JSON.stringify(talking_points) : null
    );

    const insight = db.prepare(`
      SELECT i.*, p.title as priority_title
      FROM insights i
      LEFT JOIN priorities p ON p.id = i.priority_id
      WHERE i.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({ data: insight }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { id, ...fields } = body;
    const allowed = ['key_question', 'takeaway', 'recommendation', 'executive_summary', 'talking_points'];
    const updates = Object.entries(fields)
      .filter(([k]) => allowed.includes(k))
      .map(([k, v]) => [k, k === 'talking_points' && Array.isArray(v) ? JSON.stringify(v) : v]);

    if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    const values = updates.map(([, v]) => v);
    db.prepare(`UPDATE insights SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
    return NextResponse.json({ data: db.prepare('SELECT * FROM insights WHERE id = ?').get(id) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    db.prepare('DELETE FROM insights WHERE id = ?').run(searchParams.get('id'));
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
