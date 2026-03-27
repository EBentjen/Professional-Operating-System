import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const weekId = searchParams.get('week_id');

    let priorities;
    if (weekId) {
      priorities = db.prepare('SELECT * FROM priorities WHERE week_id = ? ORDER BY order_index ASC, created_at ASC').all(weekId);
    } else {
      priorities = db.prepare('SELECT * FROM priorities ORDER BY created_at DESC LIMIT 20').all();
    }

    // Attach deliverables and stakeholders
    const enriched = (priorities as Record<string, unknown>[]).map((p) => {
      const deliverables = db.prepare('SELECT * FROM deliverables WHERE priority_id = ? ORDER BY due_date ASC').all(p.id as number);
      const stakeholders = db.prepare(`
        SELECT s.*, ps.relationship FROM stakeholders s
        JOIN priority_stakeholders ps ON ps.stakeholder_id = s.id
        WHERE ps.priority_id = ?
      `).all(p.id as number);
      return { ...p, deliverables, stakeholders };
    });

    return NextResponse.json({ data: enriched });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { week_id, title, outcome, why_it_matters, impact, deadline, order_index } = body;

    const result = db.prepare(`
      INSERT INTO priorities (week_id, title, outcome, why_it_matters, impact, deadline, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(week_id, title, outcome, why_it_matters || '', impact || 'high', deadline || null, order_index || 0);

    const priority = db.prepare('SELECT * FROM priorities WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
    return NextResponse.json({ data: { ...priority, deliverables: [], stakeholders: [] } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { id, ...fields } = body;

    const allowed = ['title', 'outcome', 'why_it_matters', 'status', 'impact', 'deadline', 'blocked_reason', 'order_index'];
    const updates = Object.entries(fields)
      .filter(([k]) => allowed.includes(k))
      .map(([k, v]) => ({ k, v }));

    if (updates.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const setClauses = updates.map(u => `${u.k} = ?`).join(', ');
    const values = updates.map(u => u.v);
    db.prepare(`UPDATE priorities SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);

    const priority = db.prepare('SELECT * FROM priorities WHERE id = ?').get(id) as Record<string, unknown>;
    const deliverables = db.prepare('SELECT * FROM deliverables WHERE priority_id = ? ORDER BY due_date ASC').all(id);
    const stakeholders = db.prepare(`
      SELECT s.*, ps.relationship FROM stakeholders s
      JOIN priority_stakeholders ps ON ps.stakeholder_id = s.id
      WHERE ps.priority_id = ?
    `).all(id);

    return NextResponse.json({ data: { ...priority, deliverables, stakeholders } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    db.prepare('DELETE FROM priorities WHERE id = ?').run(id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
