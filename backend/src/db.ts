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

/**
 * Insert a new order record.
 * Returns the inserted row (res.rows[0]) or at least the inserted id.
 */
export async function insertOrder(order: {
  status: string;
  total: number;
  items: any;
  metadata?: any;
  created_at?: string;
}) {
  const createdAt = order.created_at || new Date().toISOString();

  const res = await pool.query(
    `INSERT INTO orders (status, total, items, metadata, created_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
     RETURNING id`,
    [order.status, order.total, order.items, order.metadata || {}, createdAt]
  );

  // return either the whole row or the id depending on caller expectations
  return res.rows[0] || res.rows;
}

/**
 * Update an existing order by id.
 * fields is a partial object with columns to set (e.g., { status: 'confirmed', payment_provider_response: {...} })
 */
export async function updateOrder(id: any, fields: Record<string, any>) {
  if (!id) throw new Error("updateOrder: id is required");

  const keys = Object.keys(fields);
  if (keys.length === 0) return null;

  const sets: string[] = [];
  const values: any[] = [];

  keys.forEach((k, idx) => {
    const paramIndex = idx + 1;
    // If updating JSON-like fields, keep as jsonb in SQL
    if (["items", "metadata", "payment_provider_response"].includes(k)) {
      sets.push(`${k} = $${paramIndex}::jsonb`);
      values.push(fields[k] || {});
    } else {
      sets.push(`${k} = $${paramIndex}`);
      values.push(fields[k]);
    }
  });

  // add id as last parameter
  const idParamIndex = values.length + 1;
  const sql = `UPDATE orders SET ${sets.join(", ")} WHERE id = $${idParamIndex} RETURNING *`;

  const res = await pool.query(sql, [...values, id]);
  return res.rows[0] || null;
}

/**
 * Find order by id
 */
export async function findOrderById(id: any) {
  if (!id) return null;
  const res = await pool.query(`SELECT * FROM orders WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] || null;
}

/**
 * Provide CommonJS-compatible exports so require('../db') returns the functions
 * (orderService uses require('../db'))
 */
;(module as any).exports = {
  query,
  pool,
  insertOrder,
  updateOrder,
  findOrderById,
};
