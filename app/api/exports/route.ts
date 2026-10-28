import { authorized } from '@/lib/auth';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
const s3 = new S3Client({ forcePathStyle: true });

export async function POST() {
  if (!(await authorized())) return Response.json({ error: 'Sign in first' }, { status: 401 });
  const url = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  const secret = process.env.ORIGIN_SECRET;
  if (!url || !secret) return Response.json({ error: 'Export service is not configured' }, { status: 503 });
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'x-secret': secret }, redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Export function returned ${response.status}`);
    const body = await response.text();
    const key = `exports/${crypto.randomUUID()}.json`;
    await s3.send(new PutObjectCommand({ Bucket: 'assets', Key: key, Body: body, ContentType: 'application/json' }));
    return Response.json({ key }, { status: 201 });
  } catch (error) {
    console.error('Archive failed:', error);
    return Response.json({ error: 'Export failed. Check the Neon services.' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  if (!(await authorized())) return Response.json({ error: 'Sign in first' }, { status: 401 });
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!/^exports\/[a-f0-9-]{36}\.json$/.test(key)) return Response.json({ error: 'Invalid export key' }, { status: 400 });
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: 'assets', Key: key }));
    return new Response(await object.Body!.transformToString(), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="coursehub-export.json"', 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Export unavailable' }, { status: 404 }); }
}
