-- Initial Shopilliate schema. Created automatically by ensureSchema() in the Worker.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  shopee_url TEXT NOT NULL,
  affiliate_url TEXT,
  shop_id TEXT,
  item_id TEXT,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  sold_text TEXT,
  image_key TEXT,
  is_top INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  click_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_top ON products(is_top, status);

CREATE TABLE IF NOT EXISTS clicks (
  product_id INTEGER NOT NULL,
  at INTEGER NOT NULL
);
