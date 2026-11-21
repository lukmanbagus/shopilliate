import { Hono } from 'hono'
import type { Env } from '../types'
import { languageFromHeader, translate } from '../../shared/i18n'

export const imgRoutes = new Hono<{ Bindings: Env }>()

imgRoutes.get('*', async (c) => {
  const notFound = () =>
    c.text(translate(languageFromHeader(c.req.header('Accept-Language')), 'Tidak ditemukan'), 404)
  const key = decodeURIComponent(c.req.path.replace(/^\/img\//, ''))
  if (!key || key.includes('..')) {
    return notFound()
  }
  const object = await c.env.BUCKET.get(key)
  if (!object) {
    return notFound()
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/octet-stream')
  }
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('ETag', object.httpEtag)
  headers.set('X-Content-Type-Options', 'nosniff')

  return new Response(object.body, { headers })
})
