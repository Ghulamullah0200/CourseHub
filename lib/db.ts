import { Pool } from 'pg';
declare global { var courseHubPool: Pool | undefined }
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  if (!global.courseHubPool) global.courseHubPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 5000, connectionTimeoutMillis: 8000 });
  return global.courseHubPool;
}
