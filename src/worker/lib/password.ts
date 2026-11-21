const ITERATIONS = 100_000
const KEY_BITS = 256
const SALT_BYTES = 16

const encoder = new TextEncoder()

export function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Hex tidak valid')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function randomHex(byteLength: number): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)))
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations = ITERATIONS,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      iterations,
    },
    key,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

export interface PasswordRecord {
  hash: string
  salt: string
}

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt)
  return { hash: bytesToHex(hash), salt: bytesToHex(salt) }
}

/** Perbandingan waktu konstan sederhana untuk mencegah timing attack. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(
  password: string,
  record: PasswordRecord,
): Promise<boolean> {
  const candidate = await derive(password, hexToBytes(record.salt))
  return timingSafeEqual(bytesToHex(candidate), record.hash)
}
