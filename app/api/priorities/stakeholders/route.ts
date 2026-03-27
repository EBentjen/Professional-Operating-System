import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { priority_id, stakeholder_id, relationship } = await req.json();
    db.prepare(
      'INSERT OR REPLACE INTO priority_stakeholders (priority_id, stakeholder_id, relationship) VALUES (?, ?, ?)'
    ).run(priority_id, stakeholder_id, relationship || null);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { priority_id, stakeholder_id } = await req.json();
    db.prepare('DELETE FROM priority_stakeholders WHERE priority_id = ? AND stakeholder_id = ?').run(priority_id, stakeholder_id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
