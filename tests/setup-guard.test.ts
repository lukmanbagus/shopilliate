import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { isSetupExempt, setupGuard } from '../src/worker/lib/guard'
import { setupRoutes } from '../src/worker/routes/setup'
import type { Env } from '../src/worker/types'

interface FakeOptions {
  installed: boolean
  insertChanges?: number
}

function createFakeEnv(options: FakeOptions): Env {
  const db = {
    prepare(sql: string) {
      const statement = {
        bind: (..._args: unknown[]) => statement,
        async first() {
          if (sql.includes('FROM settings WHERE key')) {
            return options.installed ? { value: 'true' } : null
          }
          return null
        },
        async run() {
          if (sql.includes('INSERT INTO users')) {
            return { meta: { changes: options.insertChanges ?? 1, last_row_id: 1 } }
          }
          return { meta: { changes: 1 } }
        },
      }
      return statement
    },
  }
  return {
    DB: db as unknown as D1Database,
    BUCKET: {} as R2Bucket,
    ASSETS: {} as Fetcher,
  }
}

const setupInput = {
  siteName: 'Toko Uji',
  username: 'admin',
  password: 'password-panjang-123',
  confirmPassword: 'password-panjang-123',
}

const postInit = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'http://localhost',
    Host: 'localhost',
    'Accept-Language': 'id',
  },
  body: JSON.stringify(setupInput),
}

describe('guard setup', () => {
  it('mengecualikan halaman setup, API setup, dan aset statis', () => {
    expect(isSetupExempt('/setup', 'GET')).toBe(true)
    expect(isSetupExempt('/api/setup', 'POST')).toBe(true)
    expect(isSetupExempt('/api/setup/status', 'GET')).toBe(true)
    expect(isSetupExempt('/assets/index.js', 'GET')).toBe(true)
    expect(isSetupExempt('/api/public/home', 'GET')).toBe(false)
    expect(isSetupExempt('/admin', 'GET')).toBe(false)
  })

  it('mengalihkan rute non-API ke /setup sebelum instalasi', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.use('*', setupGuard())
    app.get('/admin', (c) => c.text('admin'))

    const response = await app.request('/admin', {}, createFakeEnv({ installed: false }))
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/setup')
  })

  it('menolak API dengan 403 SETUP_REQUIRED sebelum instalasi', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.use('*', setupGuard())
    app.get('/api/public/home', (c) => c.json({ ok: true }))

    const response = await app.request(
      '/api/public/home',
      {},
      createFakeEnv({ installed: false }),
    )
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('SETUP_REQUIRED')
  })

  it('meloloskan rute setelah instalasi selesai', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.use('*', setupGuard())
    app.get('/api/public/home', (c) => c.json({ ok: true }))

    const response = await app.request(
      '/api/public/home',
      {},
      createFakeEnv({ installed: true }),
    )
    expect(response.status).toBe(200)
  })

  it('menolak halaman /setup setelah instalasi selesai', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.use('*', setupGuard())
    app.get('/setup', (c) => c.text('setup'))

    const response = await app.request(
      '/setup',
      {},
      createFakeEnv({ installed: true }),
    )
    expect(response.status).toBe(404)
  })

  it('menampilkan halaman /setup selama belum terinstal', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.use('*', setupGuard())
    app.get('/setup', (c) => c.text('setup'))

    const response = await app.request(
      '/setup',
      {},
      createFakeEnv({ installed: false }),
    )
    expect(response.status).toBe(200)
  })
})

describe('POST /api/setup', () => {
  it('membuat admin, menyimpan sesi, dan mengeset cookie HttpOnly', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/api/setup', setupRoutes)

    const response = await app.request(
      '/api/setup',
      postInit,
      createFakeEnv({ installed: false }),
    )
    expect(response.status).toBe(200)
    const cookie = response.headers.get('Set-Cookie') ?? ''
    expect(cookie).toContain('shopilliate_session=')
    expect(cookie.toLowerCase()).toContain('httponly')
  })

  it('menolak setup kedua dengan 403 setelah terinstal', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/api/setup', setupRoutes)

    const response = await app.request(
      '/api/setup',
      postInit,
      createFakeEnv({ installed: true }),
    )
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('ALREADY_INSTALLED')
  })

  it('mengembalikan 409 ketika permintaan bersamaan kalah balapan insert', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/api/setup', setupRoutes)

    const response = await app.request(
      '/api/setup',
      postInit,
      createFakeEnv({ installed: false, insertChanges: 0 }),
    )
    expect(response.status).toBe(409)
  })

  it('menolak password kurang dari 10 karakter', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/api/setup', setupRoutes)

    const response = await app.request(
      '/api/setup',
      {
        ...postInit,
        body: JSON.stringify({ ...setupInput, password: 'pendek', confirmPassword: 'pendek' }),
      },
      createFakeEnv({ installed: false }),
    )
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { message: string } }
    expect(body.error.message).toBe('Password minimal 10 karakter.')
  })

  it('menolak konfirmasi password yang tidak cocok', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/api/setup', setupRoutes)

    const response = await app.request(
      '/api/setup',
      {
        ...postInit,
        body: JSON.stringify({
          ...setupInput,
          confirmPassword: 'password-lain-123',
        }),
      },
      createFakeEnv({ installed: false }),
    )
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { message: string } }
    expect(body.error.message).toBe('Konfirmasi password tidak cocok.')
  })

  it('memakai Bahasa Inggris sebagai default pesan API', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/api/setup', setupRoutes)

    const response = await app.request(
      '/api/setup',
      {
        ...postInit,
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost',
          Host: 'localhost',
        },
        body: JSON.stringify({ ...setupInput, password: 'pendek', confirmPassword: 'pendek' }),
      },
      createFakeEnv({ installed: false }),
    )
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { message: string } }
    expect(body.error.message).toBe('Password must be at least 10 characters.')
  })
})
