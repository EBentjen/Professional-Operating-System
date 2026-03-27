import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import type { OKR, KeyResult } from '@/lib/types';

function enrichOKR(db: ReturnType<typeof getDb>, okr: Record<string, unknown>): OKR {
  const krs = db.prepare('SELECT * FROM key_results WHERE okr_id = ? ORDER BY id').all(okr.id as number) as KeyResult[];
  return { ...(okr as unknown as OKR), key_results: krs };
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM okrs ORDER BY quarter DESC, id').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(r => enrichOKR(db, r)));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, description = '', quarter, status = 'on_track', key_results = [] } = body;
  if (!title?.trim() || !quarter) return NextResponse.json({ error: 'Title and quarter required' }, { status: 400 });
  const result = db.prepare('INSERT INTO okrs (title, description, quarter, status) VALUES (?, ?, ?, ?)').run(title.trim(), description, quarter, status);
  const okrId = result.lastInsertRowid;
  const insKr = db.prepare('INSERT INTO key_results (okr_id, title, target, current_value, unit, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const kr of key_results as Record<string, unknown>[]) {
    insKr.run(okrId, kr.title, kr.target || '', kr.current_value || '', kr.unit || '', kr.progress || 0, kr.status || 'on_track');
  }
  const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(okrId) as Record<string, unknown>;
  return NextResponse.json(enrichOKR(db, okr), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, key_result_id, add_key_result, ...fields } = body;

  // Adding a new key result to an existing OKR
  if (add_key_result && id) {
    const { title, target = '', current_value = '', unit = '', progress = 0, status = 'on_track' } = add_key_result;
    db.prepare('INSERT INTO key_results (okr_id, title, target, current_value, unit, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, title, target, current_value, unit, progress, status);
    return NextResponse.json(enrichOKR(db, db.prepare('SELECT * FROM okrs WHERE id = ?').get(id) as Record<string, unknown>));
  }

  // Patching a key result
  if (key_result_id) {
    const allowed = ['title', 'target', 'current_value', 'unit', 'progress', 'status'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE key_results SET ${setClauses} WHERE id = ?`).run(...updates.map(([, v]) => v), key_result_id);
    const kr = db.prepare('SELECT * FROM key_results WHERE id = ?').get(key_result_id) as Record<string, unknown>;
    const parentOkr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(kr.okr_id as number) as Record<string, unknown>;
    return NextResponse.json(enrichOKR(db, parentOkr));
  }

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const allowed = ['title', 'description', 'quarter', 'status'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length > 0) {
    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE okrs SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...updates.map(([, v]) => v), id);
  }
  return NextResponse.json(enrichOKR(db, db.prepare('SELECT * FROM okrs WHERE id = ?').get(id) as Record<string, unknown>));
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id, key_result_id } = await req.json();
  if (key_result_id) {
    db.prepare('DELETE FROM key_results WHERE id = ?').run(key_result_id);
  } else {
    db.prepare('DELETE FROM okrs WHERE id = ?').run(id);
  }
  return NextResponse.json({ ok: true });
}
