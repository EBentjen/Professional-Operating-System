import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const appPassword = process.env.APP_PASSWORD;
  const sessionToken = process.env.SESSION_TOKEN;

  if (!appPassword || !sessionToken) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  if (password !== appPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('work-os-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('work-os-session');
  return res;
}
