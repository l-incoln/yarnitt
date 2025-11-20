-- Migration: add orders table (Postgres)
-- Adjust to your migration tooling (Knex, sequelize-cli, etc.)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  total BIGINT NOT NULL DEFAULT 0, -- store cents
  items JSONB NOT NULL,
  payment_provider_id VARCHAR(255),
  payment_provider_response JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index on payment_provider_id if needed
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider_id ON orders (payment_provider_id);