import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { todayISO } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || todayISO();
    const lookback = searchParams.get('lookback');

    if (lookback) {
      const days = Math.min(Number(lookback) || 7, 30);
      const items = db.prepare(`
        SELECT df.*, p.title as priority_title
        FROM daily_focus df
        LEFT JOIN priorities p ON p.id = df.priority_id
        WHERE df.focus_date < ?
        ORDER BY df.focus_date DESC, df.order_index ASC, df.created_at ASC
        LIMIT ?
      `).all(date, days * 10);
      return NextResponse.json({ data: items });
    }

    // Range query for weekly view: ?week_start=&week_end= (priority-linked items only)
    const weekStart = searchParams.get('week_start');
    const weekEnd = searchParams.get('week_end');
    if (weekStart && weekEnd) {
      const items = db.prepare(`
        SELECT df.*, p.title as priority_title
        FROM daily_focus df
        LEFT JOIN priorities p ON p.id = df.priority_id
        WHERE df.focus_date >= ? AND df.focus_date <= ? AND df.priority_id IS NOT NULL
        ORDER BY df.focus_date ASC, df.order_index ASC
      `).all(weekStart, weekEnd);
      return NextResponse.json({ data: items });
    }

    // General date range: ?from=X&to=Y (all items, used by calendar)
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) {
      const items = db.prepare(`
        SELECT df.*, p.title as priority_title
        FROM daily_focus df
        LEFT JOIN priorities p ON p.id = df.priority_id
        WHERE df.focus_date >= ? AND df.focus_date <= ?
        ORDER BY df.focus_date ASC, df.order_index ASC
      `).all(from, to);
      return NextResponse.json({ data: items });
    }

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
    const body = await req.json();

    // Bulk import: { items: [{focus_date, title, priority_id?}] }
    if (Array.isArray(body.items)) {
      const insert = db.prepare(
        'INSERT OR IGNORE INTO daily_focus (focus_date, priority_id, title, notes, order_index) VALUES (?, ?, ?, ?, ?)'
      );
      const insertMany = db.transaction((items: { focus_date: string; title: string; priority_id?: number | null }[]) => {
        for (const item of items) {
          insert.run(item.focus_date, item.priority_id ?? null, item.title, null, 0);
        }
      });
      insertMany(body.items);
      return NextResponse.json({ ok: true, count: body.items.length }, { status: 201 });
    }

    const { focus_date, priority_id, title, notes, order_index } = body;
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
