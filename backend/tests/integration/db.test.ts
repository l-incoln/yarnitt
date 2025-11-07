import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://yarnitt:yarnittpass@localhost:5433/yarnitt_test',
});

afterAll(async () => {
  await pool.end();
});

test('pgmigrations table exists and has at least one entry', async () => {
  const res = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='pgmigrations'"
  );
  const exists = res.rows[0]?.cnt > 0;
  expect(exists).toBe(true);

  // Optional: check there is at least one recorded migration
  if (exists) {
    const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM public.pgmigrations');
    expect(r.rows[0].cnt).toBeGreaterThanOrEqual(1);
  }
}, 30000);