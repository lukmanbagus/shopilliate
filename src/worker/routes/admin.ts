import { Hono } from 'hono'
import { z } from 'zod'
import { apiError, readJson } from '../lib/http'
import { requireAuth, type AppEnv } from '../lib/auth'
import { uniqueCategorySlug } from '../lib/slug'
import {
  randomImageKey,
  putImage,
  removeImage,
  moveImage,
  validateImage,
  downloadShopeeImage,
} from '../lib/images'
import { lookupShopeeProduct } from '../lib/shopee'
import { ShopeeError } from '../lib/shopee/resolve'
import { firstIssueMessage, changePasswordSchema } from '../../shared/schemas'
import type { Category, Product, UpdateInfo } from '../../shared/types'
import { hashPassword, verifyPassword } from '../lib/password'
import { getSetting, setSetting } from '../lib/schema'
import { hashToken, readSessionCookie } from '../lib/session'
import { normalizeLanguage } from '../../shared/i18n'
import {
  APP_VERSION,
  UPDATE_REPO,
  isUpdateAvailable,
  normalizeVersion,
} from '../../shared/version'
import { DEFAULT_THEME_COLOR, normalizeHexColor } from '../../shared/theme'

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use('*', requireAuth())

const categoryInput = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(50, 'Nama kategori maksimal 50 karakter.'),
  parentId: z.number().int().positive().nullable().optional(),
  imageKey: z.string().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})

const categoryPatch = categoryInput.partial()

const productInput = z.object({
  shopeeUrl: z.string().trim().url('Link Shopee tidak valid.'),
  affiliateUrl: z
    .string()
    .trim()
    .url('Link afiliasi tidak valid.')
    .nullable()
    .optional()
    .or(z.literal('')),
  title: z.string().trim().min(1, 'Nama produk wajib diisi.').max(200, 'Nama produk maksimal 200 karakter.'),
  price: z.number().int('Harga harus bilangan bulat.').min(0, 'Harga tidak boleh negatif.'),
  categoryId: z.number().int().positive().nullable().optional(),
  soldText: z.string().trim().max(40, 'Teks terjual maksimal 40 karakter.').nullable().optional(),
  imageKey: z.string().max(200).nullable().optional(),
  isTop: z.boolean().optional(),
  status: z.enum(['published', 'hidden']).optional(),
})

const productPatch = productInput.partial()

interface CategoryRow {
  id: number
  parent_id: number | null
  slug: string
  name: string
  image_key: string | null
  sort_order: number
  product_count: number
}

interface ProductRow {
  id: number
  category_id: number | null
  category_name: string | null
  shopee_url: string
  affiliate_url: string | null
  title: string
  price: number
  sold_text: string | null
  image_key: string | null
  is_top: number
  status: string
  click_count: number
  last_synced_at: number | null
  created_at: number
  updated_at: number
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    slug: row.slug,
    name: row.name,
    imageKey: row.image_key,
    sortOrder: row.sort_order,
    productCount: row.product_count,
  }
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    shopeeUrl: row.shopee_url,
    affiliateUrl: row.affiliate_url,
    title: row.title,
    price: row.price,
    soldText: row.sold_text,
    imageKey: row.image_key,
    isTop: row.is_top === 1,
    status: row.status === 'hidden' ? 'hidden' : 'published',
    clickCount: row.click_count,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function findCategory(db: D1Database, id: number): Promise<Category | null> {
  const row = await db
    .prepare(
      `SELECT id, parent_id, slug, name, image_key, sort_order, 0 AS product_count
       FROM categories WHERE id = ?1`,
    )
    .bind(id)
    .first<CategoryRow>()
  return row ? toCategory(row) : null
}

async function findProduct(db: D1Database, id: number): Promise<Product | null> {
  const row = await db
    .prepare(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?1`,
    )
    .bind(id)
    .first<ProductRow>()
  return row ? toProduct(row) : null
}

async function resolveParent(
  db: D1Database,
  parentId: number | null | undefined,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (parentId === null || parentId === undefined) return { ok: true }
  const parent = await findCategory(db, parentId)
  if (!parent) return { ok: false, message: 'Kategori induk tidak ditemukan.' }
  if (parent.parentId !== null) {
    return { ok: false, message: 'Subkategori hanya boleh satu tingkat.' }
  }
  return { ok: true }
}

// ---------- Kategori ----------

adminRoutes.get('/categories', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c
     ORDER BY c.sort_order ASC, c.name ASC`,
  ).all<CategoryRow>()
  return c.json({ categories: (rows.results ?? []).map(toCategory) })
})

adminRoutes.post('/categories', async (c) => {
  const parsed = categoryInput.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const input = parsed.data
  const parentCheck = await resolveParent(c.env.DB, input.parentId)
  if (!parentCheck.ok) return apiError(c, 'INVALID_PARENT', parentCheck.message, 400)

  const slug = await uniqueCategorySlug(c.env.DB, input.name)
  const result = await c.env.DB.prepare(
    `INSERT INTO categories (parent_id, slug, name, image_key, sort_order)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(
      input.parentId ?? null,
      slug,
      input.name,
      input.imageKey ?? null,
      input.sortOrder ?? 0,
    )
    .run()

  const category = await findCategory(c.env.DB, Number(result.meta.last_row_id))
  return c.json({ category }, 201)
})

adminRoutes.patch('/categories/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await findCategory(c.env.DB, id)
  if (!existing) return apiError(c, 'NOT_FOUND', 'Kategori tidak ditemukan.', 404)

  const parsed = categoryPatch.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const input = parsed.data

  if (input.parentId !== undefined) {
    if (input.parentId === id) {
      return apiError(c, 'INVALID_PARENT', 'Kategori tidak boleh menjadi induk dirinya sendiri.', 400)
    }
    const parentCheck = await resolveParent(c.env.DB, input.parentId)
    if (!parentCheck.ok) return apiError(c, 'INVALID_PARENT', parentCheck.message, 400)
  }

  const slug =
    input.name !== undefined && input.name !== existing.name
      ? await uniqueCategorySlug(c.env.DB, input.name, id)
      : existing.slug

  await c.env.DB.prepare(
    `UPDATE categories SET
       parent_id = ?1, slug = ?2, name = ?3, image_key = ?4, sort_order = ?5
     WHERE id = ?6`,
  )
    .bind(
      input.parentId !== undefined ? input.parentId : existing.parentId,
      slug,
      input.name ?? existing.name,
      input.imageKey !== undefined ? input.imageKey : existing.imageKey,
      input.sortOrder ?? existing.sortOrder,
      id,
    )
    .run()

  return c.json({ category: await findCategory(c.env.DB, id) })
})

adminRoutes.delete('/categories/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await findCategory(c.env.DB, id)
  if (!existing) return apiError(c, 'NOT_FOUND', 'Kategori tidak ditemukan.', 404)

  await c.env.DB.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?1')
    .bind(id)
    .run()
  await c.env.DB.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?1')
    .bind(id)
    .run()
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?1').bind(id).run()
  await removeImage(c.env.BUCKET, existing.imageKey)

  return c.json({ ok: true })
})

// ---------- Produk ----------

adminRoutes.get('/products', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1) || 1)
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20) || 20))
  const q = (c.req.query('q') ?? '').trim()
  const category = c.req.query('category')
  const status = c.req.query('status')

  const conditions: string[] = []
  const values: unknown[] = []
  if (q) {
    values.push(`%${q}%`)
    conditions.push(`p.title LIKE ?${values.length}`)
  }
  if (category) {
    values.push(Number(category))
    conditions.push(`p.category_id = ?${values.length}`)
  }
  if (status === 'published' || status === 'hidden') {
    values.push(status)
    conditions.push(`p.status = ?${values.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM products p ${where}`,
  )
    .bind(...values)
    .first<{ total: number }>()

  const rows = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT ?${values.length + 1} OFFSET ?${values.length + 2}`,
  )
    .bind(...values, limit, (page - 1) * limit)
    .all<ProductRow>()

  return c.json({
    products: (rows.results ?? []).map(toProduct),
    total: totalRow?.total ?? 0,
    page,
    limit,
  })
})

adminRoutes.get('/products/:id', async (c) => {
  const product = await findProduct(c.env.DB, Number(c.req.param('id')))
  if (!product) return apiError(c, 'NOT_FOUND', 'Produk tidak ditemukan.', 404)
  return c.json({ product })
})

adminRoutes.post('/products', async (c) => {
  const parsed = productInput.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const input = parsed.data
  const now = Math.floor(Date.now() / 1000)
  const result = await c.env.DB.prepare(
    `INSERT INTO products
      (category_id, shopee_url, affiliate_url, title, price, sold_text, image_key,
       is_top, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`,
  )
    .bind(
      input.categoryId ?? null,
      input.shopeeUrl,
      input.affiliateUrl || null,
      input.title,
      input.price,
      input.soldText || null,
      input.imageKey || null,
      input.isTop ? 1 : 0,
      input.status ?? 'published',
      now,
    )
    .run()

  const productId = Number(result.meta.last_row_id)

  if (input.imageKey?.startsWith('uploads/')) {
    const extension = input.imageKey.split('.').pop() ?? 'jpg'
    const target = `products/${productId}/main.${extension}`
    if (await moveImage(c.env.BUCKET, input.imageKey, target)) {
      await c.env.DB.prepare('UPDATE products SET image_key = ?1 WHERE id = ?2')
        .bind(target, productId)
        .run()
    }
  }

  const product = await findProduct(c.env.DB, productId)
  return c.json({ product }, 201)
})

adminRoutes.patch('/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await findProduct(c.env.DB, id)
  if (!existing) return apiError(c, 'NOT_FOUND', 'Produk tidak ditemukan.', 404)

  const parsed = productPatch.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const input = parsed.data
  const now = Math.floor(Date.now() / 1000)

  await c.env.DB.prepare(
    `UPDATE products SET
       category_id = ?1, shopee_url = ?2, affiliate_url = ?3, title = ?4,
       price = ?5, sold_text = ?6, image_key = ?7, is_top = ?8, status = ?9,
       updated_at = ?10
     WHERE id = ?11`,
  )
    .bind(
      input.categoryId !== undefined ? input.categoryId : existing.categoryId,
      input.shopeeUrl ?? existing.shopeeUrl,
      input.affiliateUrl !== undefined
        ? input.affiliateUrl || null
        : existing.affiliateUrl,
      input.title ?? existing.title,
      input.price ?? existing.price,
      input.soldText !== undefined ? input.soldText || null : existing.soldText,
      input.imageKey !== undefined ? input.imageKey || null : existing.imageKey,
      input.isTop !== undefined ? (input.isTop ? 1 : 0) : existing.isTop ? 1 : 0,
      input.status ?? existing.status,
      now,
      id,
    )
    .run()

  if (
    input.imageKey !== undefined &&
    existing.imageKey &&
    existing.imageKey !== input.imageKey
  ) {
    await removeImage(c.env.BUCKET, existing.imageKey)
  }

  return c.json({ product: await findProduct(c.env.DB, id) })
})

adminRoutes.delete('/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await findProduct(c.env.DB, id)
  if (!existing) return apiError(c, 'NOT_FOUND', 'Produk tidak ditemukan.', 404)

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM clicks WHERE product_id = ?1').bind(id),
    c.env.DB.prepare('DELETE FROM products WHERE id = ?1').bind(id),
  ])
  await removeImage(c.env.BUCKET, existing.imageKey)

  return c.json({ ok: true })
})

// ---------- Ambil data Shopee ----------

const fetchInput = z.object({
  url: z.string().trim().min(1, 'Link Shopee wajib diisi.'),
})

function shopeeFailure(c: Parameters<typeof apiError>[0], error: unknown) {
  if (error instanceof ShopeeError) {
    return apiError(c, error.code, error.message, error.status as 400)
  }
  console.error('Failed to fetch Shopee data:', (error as Error).message)
  return apiError(
    c,
    'FETCH_FAILED',
    'Data produk tidak dapat diambil otomatis dari Shopee. Silakan isi nama, harga, dan gambar secara manual.',
    502,
  )
}

adminRoutes.post('/fetch', async (c) => {
  const parsed = fetchInput.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }

  try {
    const { data, resolved } = await lookupShopeeProduct(
      c.env.DB,
      parsed.data.url,
    )

    let imageKey: string | null = null
    if (data.imageUrl) {
      const downloaded = await downloadShopeeImage(data.imageUrl)
      if (downloaded) {
        imageKey = randomImageKey('uploads/previews', downloaded.extension)
        await putImage(
          c.env.BUCKET,
          imageKey,
          downloaded.buffer,
          downloaded.contentType,
        )
      }
    }

    return c.json({
      title: data.title,
      price: data.price,
      imageUrl: imageKey ? `/img/${imageKey}` : null,
      imageKey,
      soldText: data.soldText,
      affiliateUrl: data.affiliateUrl,
      shopId: data.shopId,
      itemId: data.itemId,
      source: data.source,
      shopeeUrl: resolved.productUrl,
    })
  } catch (error) {
    return shopeeFailure(c, error)
  }
})

adminRoutes.post('/products/:id/sync', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await findProduct(c.env.DB, id)
  if (!existing) return apiError(c, 'NOT_FOUND', 'Produk tidak ditemukan.', 404)

  try {
    const { data } = await lookupShopeeProduct(c.env.DB, existing.shopeeUrl)

    let imageKey = existing.imageKey
    if (data.imageUrl) {
      const downloaded = await downloadShopeeImage(data.imageUrl)
      if (downloaded) {
        const target = `products/${id}/main.${downloaded.extension}`
        await putImage(c.env.BUCKET, target, downloaded.buffer, downloaded.contentType)
        if (existing.imageKey && existing.imageKey !== target) {
          await removeImage(c.env.BUCKET, existing.imageKey)
        }
        imageKey = target
      }
    }

    const now = Math.floor(Date.now() / 1000)
    await c.env.DB.prepare(
      `UPDATE products SET
         shop_id = ?1, item_id = ?2, title = ?3, price = ?4, sold_text = ?5,
         affiliate_url = ?6, image_key = ?7, last_synced_at = ?8, updated_at = ?8
       WHERE id = ?9`,
    )
      .bind(
        data.shopId,
        data.itemId,
        data.title,
        data.price > 0 ? data.price : existing.price,
        data.soldText ?? existing.soldText,
        data.affiliateUrl ?? existing.affiliateUrl,
        imageKey,
        now,
        id,
      )
      .run()

    return c.json({ product: await findProduct(c.env.DB, id) })
  } catch (error) {
    return shopeeFailure(c, error)
  }
})

// ---------- Unggah gambar ----------

adminRoutes.post('/upload', async (c) => {
  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return apiError(c, 'INVALID_UPLOAD', 'Berkas tidak dapat dibaca.', 400)
  }

  const file = form.get('file')
  if (!file || typeof file === 'string') {
    return apiError(c, 'INVALID_UPLOAD', 'Berkas gambar wajib dikirim.', 400)
  }

  const buffer = await file.arrayBuffer()
  const validation = validateImage(new Uint8Array(buffer), file.type)
  if ('error' in validation) {
    return apiError(c, 'INVALID_IMAGE', validation.error, 400)
  }

  const key = randomImageKey('uploads', validation.extension)
  await putImage(c.env.BUCKET, key, buffer, validation.contentType)

  return c.json({ key, url: `/img/${key}` }, 201)
})

// ---------- Pembaruan aplikasi ----------

const UPDATE_CACHE_MS = 30 * 60 * 1000
let cachedUpdate: { expiresAt: number; info: UpdateInfo } | null = null

adminRoutes.get('/update', async (c) => {
  if (cachedUpdate && cachedUpdate.expiresAt > Date.now()) {
    return c.json(cachedUpdate.info)
  }

  const base: UpdateInfo = {
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    updateAvailable: false,
    checked: false,
    repository: UPDATE_REPO,
    releaseUrl: null,
    publishedAt: null,
  }

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(UPDATE_REPO)) {
    return c.json(base)
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'shopilliate',
        },
        signal: AbortSignal.timeout(5000),
        cf: { cacheTtl: 1800, cacheEverything: true },
      },
    )

    let info = base
    if (response.ok) {
      const release = (await response.json()) as {
        tag_name?: string
        html_url?: string
        published_at?: string
        draft?: boolean
        prerelease?: boolean
      }
      if (release.tag_name && !release.draft && !release.prerelease) {
        const latestVersion = normalizeVersion(release.tag_name)
        info = {
          currentVersion: APP_VERSION,
          latestVersion,
          updateAvailable: isUpdateAvailable(APP_VERSION, latestVersion),
          checked: true,
          repository: UPDATE_REPO,
          releaseUrl: release.html_url ?? null,
          publishedAt: release.published_at ?? null,
        }
      }
    }

    cachedUpdate = { expiresAt: Date.now() + UPDATE_CACHE_MS, info }
    return c.json(info)
  } catch {
    cachedUpdate = { expiresAt: Date.now() + 5 * 60 * 1000, info: base }
    return c.json(base)
  }
})

// ---------- Dashboard ----------

adminRoutes.get('/dashboard', async (c) => {
  const now = Math.floor(Date.now() / 1000)
  const [productTotal, clicks7, clicks30, topRows] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS total FROM products').first<{
      total: number
    }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS total FROM clicks WHERE at > ?1')
      .bind(now - 7 * 86400)
      .first<{ total: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS total FROM clicks WHERE at > ?1')
      .bind(now - 30 * 86400)
      .first<{ total: number }>(),
    c.env.DB.prepare(
      `SELECT id, title, price, image_key, click_count
       FROM products ORDER BY click_count DESC, created_at DESC LIMIT 5`,
    ).all<{
      id: number
      title: string
      price: number
      image_key: string | null
      click_count: number
    }>(),
  ])

  return c.json({
    totalProducts: productTotal?.total ?? 0,
    clicks7: clicks7?.total ?? 0,
    clicks30: clicks30?.total ?? 0,
    topProducts: (topRows.results ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      price: row.price,
      imageKey: row.image_key,
      clickCount: row.click_count,
    })),
  })
})

// ---------- Pengaturan ----------

const settingsInput = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, 'Nama situs wajib diisi.')
    .max(60, 'Nama situs maksimal 60 karakter.')
    .optional(),
  bannerText: z.string().trim().max(120, 'Teks banner maksimal 120 karakter.').optional(),
  heroTitle: z.string().trim().max(120, 'Judul hero maksimal 120 karakter.').optional(),
  heroDescription: z
    .string()
    .trim()
    .max(300, 'Deskripsi hero maksimal 300 karakter.')
    .optional(),
  affiliateDisclosure: z
    .string()
    .trim()
    .max(500, 'Pernyataan afiliasi maksimal 500 karakter.')
    .optional(),
  shopeeAppId: z.string().trim().max(100, 'App ID maksimal 100 karakter.').optional(),
  shopeeAppSecret: z.string().max(200, 'Secret maksimal 200 karakter.').optional(),
  clearShopeeCredentials: z.boolean().optional(),
  language: z.enum(['en', 'id']).optional(),
  themeColor: z.string().trim().max(20, 'Warna tidak valid.').optional(),
})

const SETTING_KEYS: Record<string, string> = {
  siteName: 'site_name',
  bannerText: 'banner_text',
  heroTitle: 'hero_title',
  heroDescription: 'hero_description',
  affiliateDisclosure: 'affiliate_disclosure',
  shopeeAppId: 'shopee_app_id',
  language: 'language',
}

adminRoutes.get('/settings', async (c) => {
  const secret = await getSetting(c.env.DB, 'shopee_app_secret')
  return c.json({
    settings: {
      siteName: (await getSetting(c.env.DB, 'site_name')) ?? '',
      bannerText: (await getSetting(c.env.DB, 'banner_text')) ?? '',
      heroTitle: (await getSetting(c.env.DB, 'hero_title')) ?? '',
      heroDescription: (await getSetting(c.env.DB, 'hero_description')) ?? '',
      affiliateDisclosure:
        (await getSetting(c.env.DB, 'affiliate_disclosure')) ?? '',
      shopeeAppId: (await getSetting(c.env.DB, 'shopee_app_id')) ?? '',
      hasShopeeSecret: Boolean(secret),
      language: normalizeLanguage(await getSetting(c.env.DB, 'language')),
      themeColor:
        normalizeHexColor(
          (await getSetting(c.env.DB, 'theme_color')) ?? DEFAULT_THEME_COLOR,
        ) ?? DEFAULT_THEME_COLOR,
    },
  })
})

adminRoutes.patch('/settings', async (c) => {
  const parsed = settingsInput.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const input = parsed.data

  let themeColorValue = null
  if (input.themeColor !== undefined) {
    themeColorValue = normalizeHexColor(input.themeColor)
    if (!themeColorValue) {
      return apiError(c, 'VALIDATION', 'Warna tidak valid.', 400)
    }
  }

  for (const [inputKey, settingKey] of Object.entries(SETTING_KEYS)) {
    const value = (input as Record<string, unknown>)[inputKey]
    if (typeof value === 'string') {
      await setSetting(c.env.DB, settingKey, value)
    }
  }

  if (themeColorValue) {
    await setSetting(c.env.DB, 'theme_color', themeColorValue)
  }

  if (input.clearShopeeCredentials) {
    await c.env.DB.prepare(
      "DELETE FROM settings WHERE key IN ('shopee_app_id', 'shopee_app_secret')",
    ).run()
  } else if (input.shopeeAppSecret) {
    await setSetting(c.env.DB, 'shopee_app_secret', input.shopeeAppSecret)
  }

  return c.json({ ok: true })
})

// ---------- Ganti password ----------

adminRoutes.post('/password', async (c) => {
  const parsed = changePasswordSchema.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const { currentPassword, newPassword } = parsed.data

  const user = await c.env.DB.prepare(
    'SELECT password_hash, password_salt FROM users WHERE id = ?1',
  )
    .bind(c.get('userId'))
    .first<{ password_hash: string; password_salt: string }>()
  if (!user) {
    return apiError(c, 'UNAUTHORIZED', 'Sesi tidak valid. Silakan masuk kembali.', 401)
  }

  const valid = await verifyPassword(currentPassword, {
    hash: user.password_hash,
    salt: user.password_salt,
  })
  if (!valid) {
    return apiError(c, 'INVALID_PASSWORD', 'Password saat ini tidak sesuai.', 400)
  }

  const { hash, salt } = await hashPassword(newPassword)
  const currentToken = readSessionCookie(c)
  const currentHash = currentToken ? await hashToken(currentToken) : ''

  await c.env.DB.batch([
    c.env.DB.prepare(
      'UPDATE users SET password_hash = ?1, password_salt = ?2 WHERE id = ?3',
    ).bind(hash, salt, c.get('userId')),
    c.env.DB.prepare(
      'DELETE FROM sessions WHERE user_id = ?1 AND token_hash != ?2',
    ).bind(c.get('userId'), currentHash),
  ])

  return c.json({ ok: true })
})
