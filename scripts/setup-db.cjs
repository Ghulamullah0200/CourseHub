const { loadEnvConfig } = require('@next/env');
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
loadEnvConfig(process.cwd());
(async () => {
  if (!process.env.DATABASE_URL_UNPOOLED) throw Error('DATABASE_URL_UNPOOLED is required for schema setup');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    await pool.query(readFileSync('sql/schema.sql', 'utf8'));
    console.log('PASS: CourseHub schema installed');
  } finally { await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
