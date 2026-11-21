import { Hono } from 'hono'
import type { Env } from '../types'
import { verifyPassword } from '../lib/password'
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  readSessionCookie,
  setSessionCookie,
} from '../lib/session'
import { requireAuth, type AppEnv } from '../lib/auth'
import { apiError, clientIp, readJson } from '../lib/http'
import { firstIssueMessage, loginInputSchema } from '../../shared/schemas'

const MAX_ATTEMPTS = 5
const WINDOW_SECONDS = 15 * 60

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/login', async (c) => {
  const parsed = loginInputSchema.safeParse(await readJson(c))
  if (!parsed.success) {
    return apiError(c, 'VALIDATION', firstIssueMessage(parsed.error), 400)
  }
  const { username, password } = parsed.data
  const ip = clientIp(c)
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - WINDOW_SECONDS

  const attempts = await c.env.DB.prepare(
    'SELECT COUNT(*) AS total FROM login_attempts WHERE ip = ?1 AND at > ?2',
  )
    .bind(ip, windowStart)
    .first<{ total: number }>()

  if ((attempts?.total ?? 0) >= MAX_ATTEMPTS) {
    return apiError(
      c,
      'RATE_LIMITED',
      'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.',
      429,
    )
  }

  const recordAttempt = async () => {
    await c.env.DB.prepare('INSERT INTO login_attempts (ip, at) VALUES (?1, ?2)')
      .bind(ip, now)
      .run()
    await c.env.DB.prepare('DELETE FROM login_attempts WHERE at <= ?1')
      .bind(windowStart)
      .run()
  }

  const user = await c.env.DB.prepare(
    'SELECT id, password_hash, password_salt FROM users WHERE username = ?1',
  )
    .bind(username)
    .first<{ id: number; password_hash: string; password_salt: string }>()

  const valid =
    user &&
    (await verifyPassword(password, {
      hash: user.password_hash,
      salt: user.password_salt,
    }))

  if (!user || !valid) {
    await recordAttempt()
    return apiError(c, 'INVALID_CREDENTIALS', 'Username atau password salah.', 401)
  }

  await c.env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?1').bind(ip).run()
  const { token } = await createSession(c.env.DB, user.id)
  setSessionCookie(c, token)
  return c.json({ ok: true })
})

authRoutes.post('/logout', async (c) => {
  await deleteSession(c.env.DB, readSessionCookie(c))
  clearSessionCookie(c)
  return c.json({ ok: true })
})

authRoutes.get('/me', requireAuth(), async (c) => {
  return c.json({ username: c.get('username') })
})
