-- Seed sample seller, categories, and a product for dev
INSERT INTO sellers (id, display_name, bio, country)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Asha Crafts', 'Handmade crochet for babies and home', 'Kenya')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, slug)
VALUES
  (1, 'Accessories', 'accessories'),
  (2, 'Home & Decor', 'home-decor'),
  (3, 'Toys', 'toys')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, seller_id, title, description, price, currency, quantity, category_id, is_active, is_sponsored)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Creme Baby Blanket', 'Soft baby blanket.', 3200.00, 'KES', 5, 2, true, true)
ON CONFLICT (id) DO NOTHING;