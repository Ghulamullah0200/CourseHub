import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
const key = () => { if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is missing'); return process.env.SESSION_SECRET };
export const token = () => createHmac('sha256', key()).update('coursehub-admin-v1').digest('hex');
export async function authorized() {
  const supplied = (await cookies()).get('coursehub_session')?.value || '';
  const expected = token();
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
