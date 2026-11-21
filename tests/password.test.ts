import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  hashPassword,
  hexToBytes,
  randomHex,
  timingSafeEqual,
  verifyPassword,
} from '../src/worker/lib/password'

describe('hash password PBKDF2', () => {
  it('menghasilkan hash dan salt yang berbeda untuk password sama', async () => {
    const a = await hashPassword('password-rahasia-123')
    const b = await hashPassword('password-rahasia-123')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(a.salt).toMatch(/^[0-9a-f]{32}$/)
  })

  it('memverifikasi password yang benar dan menolak yang salah', async () => {
    const record = await hashPassword('kucing-oranye-2026')
    await expect(verifyPassword('kucing-oranye-2026', record)).resolves.toBe(true)
    await expect(verifyPassword('kucing-oranye-2027', record)).resolves.toBe(false)
  })

  it('menolak password kosong terhadap hash asli', async () => {
    const record = await hashPassword('selalu-ada-di-hash')
    await expect(verifyPassword('', record)).resolves.toBe(false)
  })

  it('melakukan konversi hex bolak-balik', () => {
    const bytes = new Uint8Array([0, 15, 16, 255, 128])
    expect(bytesToHex(bytes)).toBe('000f10ff80')
    expect(Array.from(hexToBytes('000f10ff80'))).toEqual(Array.from(bytes))
  })

  it('membuat salt acak sepanjang 16 byte', () => {
    const first = randomHex(16)
    const second = randomHex(16)
    expect(first).toHaveLength(32)
    expect(first).not.toBe(second)
  })

  it('perbandingan waktu konstan hanya benar untuk nilai identik', () => {
    expect(timingSafeEqual('abcdef', 'abcdef')).toBe(true)
    expect(timingSafeEqual('abcdef', 'abcdeg')).toBe(false)
    expect(timingSafeEqual('abcdef', 'abcde')).toBe(false)
  })
})
