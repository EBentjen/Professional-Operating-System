import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

const TABLES = [
  'weeks',
  'stakeholders',
  'priorities',
  'priority_stakeholders',
  'deliverables',
  'follow_ups',
  'daily_focus',
  'insights',
  'weekly_reviews',
  'captures',
  'decisions',
  'wins',
  'one_on_ones',
  'okrs',
  'key_results',
  'financial_events',
  'templates',
  'template_files',
  'learnings',
];

export async function GET() {
  const db = getDb();

  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    data[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }

  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="work-os-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
