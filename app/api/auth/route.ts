import { NextRequest, NextResponse } from 'next/server';
import { authorized, token } from '@/lib/auth';
export const runtime = 'nodejs';
export async function GET() { return NextResponse.json({ authenticated: await authorized() }) }
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!process.env.ADMIN_PASSWORD || typeof password !== 'string' || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  const res = NextResponse.json({ authenticated: true });
  res.cookies.set('coursehub_session', token(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 60 * 60 * 8, path: '/' });
  return res;
}
export async function DELETE() { const res = NextResponse.json({ authenticated: false }); res.cookies.delete('coursehub_session'); return res }
