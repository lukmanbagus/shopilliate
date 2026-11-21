import type { MiddlewareHandler } from 'hono'
import type { Env } from '../types'
import { apiError } from './http'
import { isInstalled } from './schema'
import { languageFromHeader, translate } from '../../shared/i18n'

/**
 * Rute yang tetap boleh diakses sebelum instalasi selesai.
 * Aset statis diperlukan agar halaman /setup bisa dimuat.
 */
export function isSetupExempt(path: string, method: string): boolean {
  if (method === 'OPTIONS') return true
  if (path === '/setup' || path.startsWith('/setup/')) return true
  if (path === '/api/setup' || path.startsWith('/api/setup/')) return true
  if (path.startsWith('/assets/')) return true
  if (path === '/favicon.ico' || path === '/robots.txt') return true
  return false
}

export function setupGuard(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    if (c.req.path === '/setup' || c.req.path.startsWith('/setup/')) {
      const installed = await isInstalled(c.env.DB)
      if (installed) {
        const language = languageFromHeader(c.req.header('Accept-Language'))
        return c.text(translate(language, 'Tidak ditemukan'), 404)
      }
      return next()
    }
    if (isSetupExempt(c.req.path, c.req.method)) return next()
    const installed = await isInstalled(c.env.DB)
    if (installed) return next()
    if (c.req.path.startsWith('/api/')) {
      return apiError(
        c,
        'SETUP_REQUIRED',
        'Aplikasi belum diinstal. Selesaikan halaman setup terlebih dahulu.',
        403,
      )
    }
    return c.redirect('/setup', 302)
  }
}
