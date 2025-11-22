import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgres://yarnitt:yarnittpass@localhost:5432/yarnitt_dev";

const pool = new Pool({ connectionString });

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.debug('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export { pool };