import type { MiddlewareHandler } from 'hono'
import { apiError } from './http'

/**
 * Perlindungan CSRF: semua metode non-GET wajib ber-Content-Type JSON
 * (kecuali unggahan berkas) dan Origin yang sama dengan host permintaan.
 */
export function csrfGuard(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next()
    }

    const isUpload = c.req.path === '/api/admin/upload'
    const isMultipart =
      isUpload &&
      (c.req.header('Content-Type') ?? '').includes('multipart/form-data')
    const isJson = (c.req.header('Content-Type') ?? '').includes(
      'application/json',
    )
    if (!isJson && !isMultipart) {
      return apiError(
        c,
        'CSRF_CONTENT_TYPE',
        'Permintaan harus menggunakan Content-Type application/json.',
        415,
      )
    }

    const origin = c.req.header('Origin')
    const host = c.req.header('Host')
    if (!origin || !host) {
      return apiError(c, 'CSRF_ORIGIN', 'Permintaan ditolak: Origin tidak dikenal.', 403)
    }
    let originHost: string
    try {
      originHost = new URL(origin).host
    } catch {
      return apiError(c, 'CSRF_ORIGIN', 'Permintaan ditolak: Origin tidak valid.', 403)
    }
    if (originHost !== host) {
      return apiError(c, 'CSRF_ORIGIN', 'Permintaan ditolak: Origin tidak sesuai.', 403)
    }

    await next()
  }
}
