import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { todayISO } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || todayISO();

    const items = db.prepare(`
      SELECT df.*, p.title as priority_title
      FROM daily_focus df
      LEFT JOIN priorities p ON p.id = df.priority_id
      WHERE df.focus_date = ?
      ORDER BY df.order_index ASC, df.created_at ASC
    `).all(date);

    return NextResponse.json({ data: items });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { focus_date, priority_id, title, notes, order_index } = await req.json();

    const result = db.prepare(
      'INSERT INTO daily_focus (focus_date, priority_id, title, notes, order_index) VALUES (?, ?, ?, ?, ?)'
    ).run(focus_date || todayISO(), priority_id || null, title, notes || null, order_index || 0);

    const item = db.prepare(`
      SELECT df.*, p.title as priority_title
      FROM daily_focus df
      LEFT JOIN priorities p ON p.id = df.priority_id
      WHERE df.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const { id, is_complete, title, notes, priority_id } = await req.json();
    const updates: [string, unknown][] = [];
    if (is_complete !== undefined) updates.push(['is_complete', is_complete ? 1 : 0]);
    if (title !== undefined) updates.push(['title', title]);
    if (notes !== undefined) updates.push(['notes', notes]);
    if (priority_id !== undefined) updates.push(['priority_id', priority_id ?? null]);

    if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    const values = updates.map(([, v]) => v);
    db.prepare(`UPDATE daily_focus SET ${setClauses} WHERE id = ?`).run(...values, id);

    const item = db.prepare(`
      SELECT df.*, p.title as priority_title
      FROM daily_focus df
      LEFT JOIN priorities p ON p.id = df.priority_id
      WHERE df.id = ?
    `).get(id);
    return NextResponse.json({ data: item });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    db.prepare('DELETE FROM daily_focus WHERE id = ?').run(searchParams.get('id'));
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
