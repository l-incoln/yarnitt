import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgres://yarnitt:yarnittpass@localhost:5433/yarnitt_test';

describe('integration: database', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  test('users table exists', async () => {
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    expect(res.rows.length).toBeGreaterThan(0);
  });

  test('pgmigrations table exists and has applied records', async () => {
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pgmigrations'
    `);
    expect(res.rows.length).toBeGreaterThan(0);

    const migrations = await client.query(`SELECT name FROM public.pgmigrations ORDER BY run_on`);
    expect(migrations.rows.length).toBeGreaterThanOrEqual(1);
  });
});