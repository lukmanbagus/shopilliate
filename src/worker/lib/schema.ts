export const SCHEMA_VERSION = 1

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT NOT NULL,
    at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    image_key TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS products (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_products_top ON products(is_top, status)`,
  `CREATE TABLE IF NOT EXISTS clicks (
    product_id INTEGER NOT NULL,
    at INTEGER NOT NULL
  )`,
]

const ready = new WeakMap<D1Database, Promise<void>>()

async function applySchema(db: D1Database): Promise<void> {
  await db.batch(STATEMENTS.map((sql) => db.prepare(sql)))
  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('schema_version', ?1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value
       WHERE CAST(settings.value AS INTEGER) < CAST(excluded.value AS INTEGER)`,
    )
    .bind(String(SCHEMA_VERSION))
    .run()
}

/**
 * Membuat skema secara idempoten pada permintaan pertama tiap isolate.
 * Pengguna tidak perlu menjalankan migrasi manual.
 */
export function ensureSchema(db: D1Database): Promise<void> {
  const existing = ready.get(db)
  if (existing) return existing
  const promise = applySchema(db).catch((error) => {
    ready.delete(db)
    throw error
  })
  ready.set(db, promise)
  return promise
}

export async function getSetting(
  db: D1Database,
  key: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM settings WHERE key = ?1')
    .bind(key)
    .first<{ value: string }>()
  return row?.value ?? null
}

export async function isInstalled(db: D1Database): Promise<boolean> {
  const installed = await getSetting(db, 'installed')
  if (installed === 'true') return true
  const row = await db
    .prepare('SELECT 1 AS ok FROM users LIMIT 1')
    .first<{ ok: number }>()
  return Boolean(row)
}

/** Menyimpan pengaturan; nilai dirahasiakan tidak pernah ditulis ke log. */
export async function setSetting(
  db: D1Database,
  key: string,
  value: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(key, value)
    .run()
}
