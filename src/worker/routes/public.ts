import { Hono } from 'hono'
import { apiError } from '../lib/http'
import type { Env } from '../types'
import { normalizeLanguage } from '../../shared/i18n'
import { DEFAULT_THEME_COLOR, normalizeHexColor } from '../../shared/theme'

export const publicRoutes = new Hono<{ Bindings: Env }>()

const PUBLIC_SETTING_KEYS = [
  'site_name',
  'banner_text',
  'hero_title',
  'hero_description',
  'affiliate_disclosure',
  'language',
  'theme_color',
]

interface CategoryRow {
  id: number
  parent_id: number | null
  slug: string
  name: string
  image_key: string | null
  sort_order: number
  product_count: number
}

interface PublicProductRow {
  id: number
  title: string
  price: number
  sold_text: string | null
  image_key: string | null
  is_top: number
  affiliate_url: string | null
  shopee_url: string
  category_slug: string | null
  category_name: string | null
}

const CATEGORY_COUNT = `(SELECT COUNT(*) FROM products p
  WHERE p.status = 'published' AND (
    p.category_id = c.id OR p.category_id IN (
      SELECT child.id FROM categories child WHERE child.parent_id = c.id
    )
  )) AS product_count`

const PRODUCT_SELECT = `SELECT p.id, p.title, p.price, p.sold_text, p.image_key,
  p.is_top, p.affiliate_url, p.shopee_url,
  c.slug AS category_slug, c.name AS category_name
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`

function toPublicProduct(row: PublicProductRow) {
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    soldText: row.sold_text,
    imageKey: row.image_key,
    isTop: row.is_top === 1,
    url: row.affiliate_url || row.shopee_url,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
  }
}

function toCategory(row: CategoryRow) {
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

publicRoutes.get('/home', async (c) => {
  const [settingsResult, categoriesResult, topsResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT key, value FROM settings WHERE key IN (${PUBLIC_SETTING_KEYS.map(
        () => '?',
      ).join(',')})`,
    )
      .bind(...PUBLIC_SETTING_KEYS)
      .all<{ key: string; value: string }>(),
    c.env.DB.prepare(
      `SELECT c.*, ${CATEGORY_COUNT}
       FROM categories c ORDER BY c.sort_order ASC, c.name ASC`,
    ).all<CategoryRow>(),
    c.env.DB.prepare(
      `${PRODUCT_SELECT} WHERE p.status = 'published' AND p.is_top = 1
       ORDER BY p.created_at DESC, p.id DESC LIMIT 8`,
    ).all<PublicProductRow>(),
  ])

  const settings: Record<string, string> = {}
  for (const row of settingsResult.results ?? []) settings[row.key] = row.value

  return c.json({
    settings: {
      siteName: settings.site_name ?? 'Shopilliate',
      bannerText: settings.banner_text ?? '',
      heroTitle: settings.hero_title ?? '',
      heroDescription: settings.hero_description ?? '',
      affiliateDisclosure: settings.affiliate_disclosure ?? '',
      language: normalizeLanguage(settings.language),
      themeColor:
        normalizeHexColor(settings.theme_color ?? DEFAULT_THEME_COLOR) ??
        DEFAULT_THEME_COLOR,
    },
    categories: (categoriesResult.results ?? []).map(toCategory),
    topProducts: (topsResult.results ?? []).map(toPublicProduct),
  })
})

const SORTS: Record<string, string> = {
  popular: 'p.click_count DESC, p.created_at DESC',
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC, p.id DESC',
  price_desc: 'p.price DESC, p.id DESC',
}

publicRoutes.get('/products', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1) || 1)
  const limit = Math.min(
    48,
    Math.max(1, Number(c.req.query('limit') ?? 24) || 24),
  )
  const q = (c.req.query('q') ?? '').trim()
  const sort = SORTS[c.req.query('sort') ?? 'popular'] ? (c.req.query('sort') ?? 'popular') : 'popular'
  const categorySlug = c.req.query('category')

  let category: CategoryRow | null = null
  let categoryIds: number[] = []
  let subcategories: CategoryRow[] = []
  let parent: { slug: string; name: string } | null = null

  if (categorySlug) {
    category = await c.env.DB.prepare(
      `SELECT c.*, ${CATEGORY_COUNT}
       FROM categories c WHERE c.slug = ?1`,
    )
      .bind(categorySlug)
      .first<CategoryRow>()

    if (!category) {
      return apiError(c, 'NOT_FOUND', 'Kategori tidak ditemukan.', 404)
    }

    const rootId = category.parent_id ?? category.id
    const childrenResult = await c.env.DB.prepare(
      `SELECT c.*, ${CATEGORY_COUNT}
       FROM categories c WHERE c.parent_id = ?1
       ORDER BY c.sort_order ASC, c.name ASC`,
    )
      .bind(rootId)
      .all<CategoryRow>()
    subcategories = childrenResult.results ?? []

    if (category.parent_id === null) {
      categoryIds = [category.id, ...subcategories.map((child) => child.id)]
    } else {
      categoryIds = [category.id]
      parent = await c.env.DB.prepare(
        'SELECT slug, name FROM categories WHERE id = ?1',
      )
        .bind(category.parent_id)
        .first<{ slug: string; name: string }>()
    }
  }

  const conditions = ["p.status = 'published'"]
  const values: unknown[] = []

  if (q) {
    values.push(`%${q}%`)
    conditions.push(`p.title LIKE ?${values.length}`)
  }
  if (categoryIds.length) {
    const placeholders = categoryIds
      .map((_, index) => `?${values.length + index + 1}`)
      .join(',')
    conditions.push(`p.category_id IN (${placeholders})`)
    values.push(...categoryIds)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM products p ${where}`,
  )
    .bind(...values)
    .first<{ total: number }>()

  const rows = await c.env.DB.prepare(
    `${PRODUCT_SELECT} ${where}
     ORDER BY ${SORTS[sort]}
     LIMIT ?${values.length + 1} OFFSET ?${values.length + 2}`,
  )
    .bind(...values, limit, (page - 1) * limit)
    .all<PublicProductRow>()

  return c.json({
    products: (rows.results ?? []).map(toPublicProduct),
    total: totalRow?.total ?? 0,
    page,
    limit,
    category: category ? toCategory(category) : null,
    parent,
    subcategories: subcategories.map(toCategory),
  })
})

export const clickRoutes = new Hono<{ Bindings: Env }>()

clickRoutes.post('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return apiError(c, 'VALIDATION', 'Produk tidak valid.', 400)
  }

  const product = await c.env.DB.prepare(
    "SELECT id FROM products WHERE id = ?1 AND status = 'published'",
  )
    .bind(id)
    .first<{ id: number }>()
  if (!product) {
    return apiError(c, 'NOT_FOUND', 'Produk tidak ditemukan.', 404)
  }

  const now = Math.floor(Date.now() / 1000)
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO clicks (product_id, at) VALUES (?1, ?2)').bind(
      id,
      now,
    ),
    c.env.DB.prepare(
      'UPDATE products SET click_count = click_count + 1 WHERE id = ?1',
    ).bind(id),
  ])

  return c.json({ ok: true }, 202)
})
