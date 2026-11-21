#!/usr/bin/env node
/**
 * Jalur 2: setup satu perintah.
 * Membuat D1 dan R2 bila belum ada, menulis database_id ke wrangler.jsonc,
 * membangun frontend, lalu mendeploy Worker.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const isWindows = process.platform === 'win32'
const npx = isWindows ? 'npx.cmd' : 'npx'
const npm = isWindows ? 'npm.cmd' : 'npm'

const D1_NAME = 'shopilliate-db'
const R2_NAME = 'shopilliate-images'

function run(command, args) {
  console.log(`\n→ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Perintah gagal: ${command} ${args.join(' ')}`)
  }
}

function capture(command, args) {
  return spawnSync(command, args, { cwd: root, encoding: 'utf8' })
}

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function ensureLogin() {
  console.log('Memeriksa login Cloudflare…')
  const who = capture(npx, ['wrangler', 'whoami'])
  if (who.status === 0) {
    console.log('Login Cloudflare terdeteksi.')
    return
  }
  console.log('Belum login. Membuka halaman login Cloudflare…')
  run(npx, ['wrangler', 'login'])
}

function listDatabases() {
  const result = capture(npx, ['wrangler', 'd1', 'list', '--json'])
  if (result.status !== 0) return []
  try {
    const parsed = JSON.parse(result.stdout)
    return Array.isArray(parsed) ? parsed : (parsed.result ?? [])
  } catch {
    return []
  }
}

function ensureD1() {
  console.log(`\nMemeriksa database D1 "${D1_NAME}"…`)
  let database = listDatabases().find((item) => item.name === D1_NAME)
  if (!database) {
    console.log(`Database belum ada. Membuat "${D1_NAME}"…`)
    run(npx, ['wrangler', 'd1', 'create', D1_NAME])
    database = listDatabases().find((item) => item.name === D1_NAME)
  }
  if (!database) {
    fail(
      'Database D1 tidak dapat dibuat atau ditemukan. Coba jalankan lagi, atau buat manual: npx wrangler d1 create ' +
        D1_NAME,
    )
  }
  const id = database.uuid ?? database.id
  if (!id) fail('ID database D1 tidak ditemukan pada keluaran Wrangler.')
  console.log(`Database D1 siap (${id}).`)
  return id
}

function ensureR2() {
  console.log(`\nMemeriksa bucket R2 "${R2_NAME}"…`)
  const result = capture(npx, ['wrangler', 'r2', 'bucket', 'create', R2_NAME])
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0 && !/already exists|already own/i.test(output)) {
    fail(
      'Bucket R2 tidak dapat dibuat. Pastikan R2 sudah diaktifkan di akun Cloudflare Anda (R2 memiliki kuota gratis).',
    )
  }
  console.log(`Bucket R2 siap: ${R2_NAME}.`)
}

function writeDatabaseId(id) {
  const configPath = path.join(root, 'wrangler.jsonc')
  let config = readFileSync(configPath, 'utf8')

  if (/"database_id"\s*:/.test(config)) {
    config = config.replace(/("database_id"\s*:\s*)"[^"]*"/, `$1"${id}"`)
  } else {
    const pattern =
      /(\{\s*"binding"\s*:\s*"DB"\s*,\s*"database_name"\s*:\s*"shopilliate-db")/
    if (!pattern.test(config)) {
      fail('Blok binding DB tidak ditemukan di wrangler.jsonc.')
    }
    config = config.replace(pattern, `$1,\n      "database_id": "${id}"`)
  }

  writeFileSync(configPath, config)
  console.log('database_id ditulis ke wrangler.jsonc.')
}

function deploy() {
  console.log('\nMembangun frontend…')
  run(npm, ['run', 'build'])

  console.log('\nMendeploy Worker…')
  const result = capture(npx, ['wrangler', 'deploy'])
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  if (result.status !== 0) fail('Deploy gagal. Periksa pesan Wrangler di atas.')

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  const url = output.match(/https:\/\/[^\s]+\.workers\.dev/i)?.[0]

  console.log('\n──────────────────────────────────────────')
  console.log('Selesai! Worker berhasil dideploy.')
  if (url) {
    console.log(`Buka ${url} untuk menyelesaikan setup admin.`)
  } else {
    console.log(
      'Buka URL Worker Anda di dashboard Cloudflare untuk menyelesaikan setup admin.',
    )
  }
  console.log(
    'Disarankan segera membuka URL tersebut agar orang lain tidak lebih dulu membuat akun admin.',
  )
  console.log('──────────────────────────────────────────')
}

function main() {
  console.log('Shopilliate — setup Cloudflare satu perintah')
  ensureLogin()
  const databaseId = ensureD1()
  ensureR2()
  writeDatabaseId(databaseId)
  deploy()
}

try {
  main()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
