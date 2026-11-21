import { Hono } from 'hono'
import type { Env } from '../types'
import { hashPassword, timingSafeEqual } from '../lib/password'
import { createSession, setSessionCookie } from '../lib/session'
import { isInstalled, getSetting, setSetting } from '../lib/schema'
import { apiError, readJson } from '../lib/http'
import { firstIssueMessage, setupInputSchema } from '../../shared/schemas'
import { normalizeLanguage } from '../../shared/i18n'
import { DEFAULT_THEME_COLOR, normalizeHexColor } from '../../shared/theme'
import {
  DEFAULT_CURRENCY,
  normalizeCurrency,
} from '../../shared/currency'

export const setupRoutes = new Hono<{ Bindings: Env }>()

setupRoutes.get('/status', async (c) => {
  const installed = await isInstalled(c.env.DB)
  const language = normalizeLanguage(await getSetting(c.env.DB, 'language'))
  const themeColor =
    normalizeHexColor(
      (await getSetting(c.env.DB, 'theme_color')) ?? DEFAULT_THEME_COLOR,
    ) ?? DEFAULT_THEME_COLOR
  const currency = normalizeCurrency(
    (await getSetting(c.env.DB, 'currency')) ?? DEFAULT_CURRENCY,
  )
  return c.json({
    installed,
    needsToken: Boolean(c.env.SETUP_TOKEN),
    language,
    themeColor,
    currency,
  })
})

setupRoutes.post('/', async (c) => {
  if (await isInstalled(c.env.DB)) {
    return apiError(
      c,
      'ALREADY_INSTALLED',
      'Aplikasi sudah diinstal. Halaman setup tidak tersedia lagi.',
      403,
    )
  }

  const parsed = setupInputSchema.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const input = parsed.data

  if (c.env.SETUP_TOKEN && !timingSafeEqual(input.setupToken ?? '', c.env.SETUP_TOKEN)) {
    return apiError(c, 'SETUP_TOKEN', 'Kode setup tidak sesuai.', 403)
  }

  const { hash, salt } = await hashPassword(input.password)
  const now = Math.floor(Date.now() / 1000)

  const insert = await c.env.DB.prepare(
    `INSERT INTO users (username, password_hash, password_salt, created_at)
     SELECT ?1, ?2, ?3, ?4
     WHERE NOT EXISTS (SELECT 1 FROM users)`,
  )
    .bind(input.username, hash, salt, now)
    .run()

  if (!insert.meta.changes) {
    return apiError(
      c,
      'ALREADY_INSTALLED',
      'Aplikasi sudah diinstal oleh permintaan lain. Silakan masuk.',
      409,
    )
  }

  const userId = Number(insert.meta.last_row_id)
  await setSetting(c.env.DB, 'installed', 'true')
  await setSetting(c.env.DB, 'site_name', input.siteName)

  const { token } = await createSession(c.env.DB, userId)
  setSessionCookie(c, token)

  return c.json({ ok: true })
})
