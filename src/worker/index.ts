import { Hono } from 'hono'
import { ensureSchema } from './lib/schema'
import { setupGuard } from './lib/guard'
import { csrfGuard } from './lib/csrf'
import { securityHeaders } from './lib/headers'
import { requireAuth, type AppEnv } from './lib/auth'
import { apiError } from './lib/http'
import { languageFromHeader, translate } from '../shared/i18n'
import { setupRoutes } from './routes/setup'
import { authRoutes } from './routes/auth'
import { adminRoutes } from './routes/admin'
import { imgRoutes } from './routes/img'
import { publicRoutes, clickRoutes } from './routes/public'

const app = new Hono<AppEnv>()

app.use('*', securityHeaders())
app.use('*', csrfGuard())
app.use('*', async (c, next) => {
  await ensureSchema(c.env.DB)
  await next()
})
app.use('*', setupGuard())

app.route('/api/setup', setupRoutes)
app.route('/api/auth', authRoutes)
app.get('/api/me', requireAuth(), (c) =>
  c.json({ username: c.get('username') }),
)
app.route('/api/admin', adminRoutes)
app.route('/api/public', publicRoutes)
app.route('/api/click', clickRoutes)
app.route('/img', imgRoutes)

app.get('/api/health', (c) => c.json({ ok: true }))

// Semua permintaan lain: sajikan aset statis (SPA fallback oleh Cloudflare).
app.on(['GET', 'HEAD'], '*', (c) => {
  if (c.req.path.startsWith('/api/')) {
    return apiError(c, 'NOT_FOUND', 'Endpoint tidak ditemukan.', 404)
  }
  return c.env.ASSETS.fetch(c.req.raw)
})

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return apiError(c, 'NOT_FOUND', 'Endpoint tidak ditemukan.', 404)
  }
  return c.text(
    translate(
      languageFromHeader(c.req.header('Accept-Language')),
      'Tidak ditemukan',
    ),
    404,
  )
})

app.onError((error, c) => {
  console.error('Kesalahan worker:', error)
  return apiError(
    c,
    'INTERNAL',
    'Terjadi kesalahan pada server. Silakan coba lagi.',
    500,
  )
})

export default app
