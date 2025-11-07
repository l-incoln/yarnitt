INSERT INTO users (id, email, password_hash, role, name, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'test@example.com', 'password-hash-placeholder', 'buyer', 'Test User', NOW())
ON CONFLICT (email) DO NOTHING;