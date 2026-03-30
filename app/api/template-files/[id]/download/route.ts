import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const row = db.prepare('SELECT * FROM template_files WHERE id = ?').get(Number(id)) as {
    filename: string;
    mime_type: string;
    file_data: string;
  } | undefined;

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = Buffer.from(row.file_data, 'base64');
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': row.mime_type,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(row.filename)}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
