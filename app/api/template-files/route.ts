import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET — list all files (no file_data to keep payload small)
export async function GET() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT id, title, filename, category, description, mime_type, file_size, created_at FROM template_files ORDER BY category, title'
  ).all();
  return NextResponse.json(rows);
}

// POST — upload a file (multipart/form-data)
export async function POST(req: NextRequest) {
  const db = getDb();
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const title = (form.get('title') as string | null)?.trim();
  const category = (form.get('category') as string) || 'general';
  const description = (form.get('description') as string) || '';

  if (!file || !title) {
    return NextResponse.json({ error: 'File and title are required' }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const file_data = buffer.toString('base64');

  const result = db.prepare(
    'INSERT INTO template_files (title, filename, category, description, mime_type, file_size, file_data) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, file.name, category, description, file.type || 'application/octet-stream', file.size, file_data);

  const row = db.prepare(
    'SELECT id, title, filename, category, description, mime_type, file_size, created_at FROM template_files WHERE id = ?'
  ).get(result.lastInsertRowid);

  return NextResponse.json(row, { status: 201 });
}

// DELETE — remove a file by id
export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  db.prepare('DELETE FROM template_files WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
