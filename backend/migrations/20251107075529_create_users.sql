-- Migration: create users and sellers (timestamped)
-- Filename: 20251107075529_create_users.sql
-- This migration is idempotent (uses IF NOT EXISTS) so it is safe to run even if tables already exist.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'buyer',
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT,
  bio TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);