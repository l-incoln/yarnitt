INSERT INTO users (email, password_hash)
VALUES
  ('alice@example.com', 'fakehash1'),
  ('bob@example.com', 'fakehash2')
ON CONFLICT DO NOTHING;