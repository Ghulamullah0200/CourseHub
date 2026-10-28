import { timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 5000 });
pool.on('error', error => console.error('Export database pool:', error.message));

export default async function hello(request: Request): Promise<Response> {
  const expected = process.env.ORIGIN_SECRET;
  const supplied = request.headers.get('x-secret') || '';
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables = ['persons', 'students', 'instructors', 'courses', 'batches', 'enrollments', 'payments'];
    const records: Record<string, unknown[]> = {};
    for (const table of tables) records[table] = (await client.query(`SELECT * FROM ${table}`)).rows;
    await client.query('COMMIT');
    return Response.json({ exportedAt: new Date().toISOString(), records });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Export failed:', error);
    return new Response('Export failed', { status: 503 });
  } finally { client.release(); }
}
