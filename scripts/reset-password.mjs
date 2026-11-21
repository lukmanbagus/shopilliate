#!/usr/bin/env node
/**
 * Mengatur ulang password admin tanpa menyimpan atau mencetak password asli.
 * Default: database D1 remote. Gunakan --local untuk data pengembangan lokal.
 */
import { spawnSync } from 'node:child_process'
import { webcrypto } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const isWindows = process.platform === 'win32'
const npx = isWindows ? 'npx.cmd' : 'npx'
const local = process.argv.includes('--local')
const mode = local ? '--local' : '--remote'
const databaseName = process.env.D1_DATABASE_NAME || 'shopilliate-db'

const ITERATIONS = 100_000

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function d1(command) {
  return spawnSync(
    npx,
    [
      'wrangler',
      'd1',
      'execute',
      databaseName,
      mode,
      '--json',
      '--command',
      command,
    ],
    { cwd: root, encoding: 'utf8' },
  )
}

function hex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256,
  )
  return { hash: hex(new Uint8Array(bits)), salt: hex(salt) }
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('Terminal interaktif diperlukan untuk mengisi password.'))
      return
    }
    process.stdout.write(question)
    const stdin = process.stdin
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''

    const cleanup = () => {
      stdin.removeListener('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
    }
    const onData = (char) => {
      if (char === '\u0003') {
        cleanup()
        process.stdout.write('\n')
        reject(new Error('Dibatalkan.'))
        return
      }
      if (char === '\r' || char === '\n') {
        cleanup()
        process.stdout.write('\n')
        resolve(value)
        return
      }
      if (char === '\u007f') {
        value = value.slice(0, -1)
        return
      }
      if (!char.includes('\u001b')) value += char
    }
    stdin.on('data', onData)
  })
}

async function main() {
  console.log('Shopilliate — atur ulang password admin')
  console.log(
    `Database: ${databaseName} (${local ? 'lokal' : 'remote Cloudflare'})`,
  )

  if (!local) {
    const who = spawnSync(npx, ['wrangler', 'whoami'], {
      cwd: root,
      encoding: 'utf8',
    })
    if (who.status !== 0) {
      fail('Belum login Cloudflare. Jalankan: npx wrangler login')
    }
  }

  const query = d1('SELECT id, username FROM users ORDER BY id LIMIT 1')
  if (query.status !== 0) {
    fail(
      `Tidak dapat membaca tabel users. Pastikan database "${databaseName}" sudah ada dan aplikasi pernah dibuka.\n${query.stderr ?? ''}`,
    )
  }

  let rows = []
  try {
    const parsed = JSON.parse(query.stdout)
    rows = Array.isArray(parsed)
      ? parsed.flatMap((entry) => entry.results ?? [])
      : (parsed.results ?? [])
  } catch {
    fail('Keluaran Wrangler tidak dapat dibaca.')
  }

  const user = rows[0]
  if (!user) fail('Belum ada akun admin. Buka aplikasi dan selesaikan setup dahulu.')

  let password = ''
  while (password.length < 10) {
    password = await askHidden(`Password baru untuk "${user.username}": `)
    if (password.length < 10) {
      console.log('Password minimal 10 karakter. Coba lagi.')
    }
  }
  const confirmation = await askHidden('Ulangi password baru: ')
  if (password !== confirmation) {
    fail('Konfirmasi tidak cocok. Tidak ada perubahan yang disimpan.')
  }

  const { hash, salt } = await hashPassword(password)

  const update = d1(
    `UPDATE users SET password_hash = '${hash}', password_salt = '${salt}' WHERE id = ${Number(user.id)}`,
  )
  if (update.status !== 0) {
    fail(`Gagal menyimpan password baru.\n${update.stderr ?? ''}`)
  }

  const clear = d1('DELETE FROM sessions')
  if (clear.status !== 0) {
    fail(`Password tersimpan, tetapi sesi lama gagal dihapus.\n${clear.stderr ?? ''}`)
  }

  console.log(
    `\n✔ Password untuk "${user.username}" berhasil diubah. Semua sesi lama telah dikeluarkan.`,
  )
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
