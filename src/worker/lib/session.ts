import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Env } from '../types'

export const SESSION_COOKIE = 'shopilliate_session'
export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60

const SESSION_BYTES = 32

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

export function newSessionToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(SESSION_BYTES)))
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )
  return toHex(new Uint8Array(digest))
}

export interface SessionUser {
  id: number
  username: string
  expires_at: number
}

export async function createSession(
  db: D1Database,
  userId: number,
): Promise<{ token: string; expiresAt: number }> {
  const token = newSessionToken()
  const tokenHash = await hashToken(token)
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + SESSION_TTL_SECONDS
  await db
    .prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)',
    )
    .bind(tokenHash, userId, expiresAt)
    .run()
  await db
    .prepare('DELETE FROM sessions WHERE expires_at <= ?1')
    .bind(now)
    .run()
  return { token, expiresAt }
}

export async function getSessionUser(
  db: D1Database,
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null
  const tokenHash = await hashToken(token)
  const row = await db
    .prepare(
      `SELECT users.id AS id, users.username AS username, sessions.expires_at AS expires_at
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?1 AND sessions.expires_at > ?2`,
    )
    .bind(tokenHash, Math.floor(Date.now() / 1000))
    .first<SessionUser>()
  return row ?? null
}

export async function deleteSession(
  db: D1Database,
  token: string | undefined,
): Promise<void> {
  if (!token) return
  const tokenHash = await hashToken(token)
  await db
    .prepare('DELETE FROM sessions WHERE token_hash = ?1')
    .bind(tokenHash)
    .run()
}

function isSecureRequest(c: Context): boolean {
  return new URL(c.req.url).protocol === 'https:'
}

export function setSessionCookie(
  c: Context,
  token: string,
  maxAge = SESSION_TTL_SECONDS,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Lax',
    path: '/',
    maxAge,
  })
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    secure: isSecureRequest(c),
    sameSite: 'Lax',
  })
}

export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE)
}
