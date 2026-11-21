#!/usr/bin/env node
/**
 * Cloudflare setup:
 * - create new D1 and R2 resources, or
 * - reuse an existing deployment by picking its D1 database and R2 bucket.
 * Then build and deploy the Worker.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
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
const CONFIG_PATH = path.join(root, 'wrangler.jsonc')

const args = process.argv.slice(2)
const hasFlag = (name) => args.includes(name)

function optionValue(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = args.indexOf(name)
  if (index >= 0) {
    const value = args[index + 1]
    if (value && !value.startsWith('--')) return value
  }
  return undefined
}

function printHelp() {
  console.log(`Shopilliate — Cloudflare setup

Usage:
  npm run setup
  npm run setup -- --new
  npm run setup -- --existing --d1 <name|uuid> --r2 <bucket> --worker <name>

Options:
  --new         Create new D1 and R2 resources
  --existing    Reuse resources from an existing deployment
  --d1          Existing D1 database name or UUID
  --r2          Existing R2 bucket name
  --worker      Worker name to deploy (defaults to wrangler.jsonc)
  -h, --help    Show this help

When run in a terminal without flags, you will be asked whether to create new
resources or reuse an existing deployment. No credentials are stored; only
database IDs and resource names are written to wrangler.jsonc.`)
}

function run(command, commandArgs) {
  console.log(`\n→ ${command} ${commandArgs.join(' ')}`)
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Perintah gagal: ${command} ${commandArgs.join(' ')}`)
  }
}

function capture(command, commandArgs) {
  return spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8' })
}

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

async function ask(question, defaultValue = '') {
  if (!process.stdin.isTTY) return defaultValue
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : ''
    const answer = (await rl.question(`${question}${suffix}: `)).trim()
    return answer || defaultValue
  } finally {
    rl.close()
  }
}

function readWorkerName() {
  const config = readFileSync(CONFIG_PATH, 'utf8')
  return config.match(/"name"\s*:\s*"([^"]+)"/)?.[1] ?? 'shopilliate'
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
    const rows = Array.isArray(parsed) ? parsed : (parsed.result ?? [])
    return rows
      .map((row) => ({
        name: row.name,
        id: row.uuid ?? row.id,
      }))
      .filter((row) => row.name && row.id)
  } catch {
    return []
  }
}

function listBuckets() {
  const json = capture(npx, ['wrangler', 'r2', 'bucket', 'list', '--json'])
  if (json.status === 0) {
    try {
      const parsed = JSON.parse(json.stdout)
      const rows = Array.isArray(parsed) ? parsed : (parsed.result ?? [])
      const names = rows
        .map((row) => (typeof row === 'string' ? row : row.name))
        .filter(Boolean)
      if (names.length) return names
    } catch {
      // Lanjut ke parsing teks biasa.
    }
  }

  const plain = capture(npx, ['wrangler', 'r2', 'bucket', 'list'])
  if (plain.status !== 0) return []

  const names = new Set()
  for (const line of (plain.stdout ?? '').split('\n')) {
    const labeled = line.match(/^\s*name\s*:\s*([a-z0-9][a-z0-9.-]*)\s*$/i)
    if (labeled) names.add(labeled[1])
    const tableRow = line.match(/^\s*[│|]\s*([a-z0-9][a-z0-9.-]*)\s*[│|]/i)
    if (tableRow && !/^name$/i.test(tableRow[1])) names.add(tableRow[1])
  }
  return [...names]
}

async function chooseMode() {
  if (hasFlag('--new') && hasFlag('--existing')) {
    fail('Pilih salah satu: --new atau --existing.')
  }
  if (hasFlag('--new')) return 'new'
  if (hasFlag('--existing')) return 'existing'
  if (!process.stdin.isTTY) return 'new'

  console.log('\nBagaimana resource Cloudflare akan disiapkan?')
  console.log('  1. Buat resource baru (D1 + R2)')
  console.log('  2. Gunakan deployment yang sudah ada (pilih D1 + R2)')
  const answer = await ask('Pilih 1 atau 2', '1')
  return answer === '2' ? 'existing' : 'new'
}

async function chooseDatabase(databases) {
  while (true) {
    const answer = await ask(
      'Pilih nomor atau ketik nama database (kosong untuk batal)',
    )
    if (!answer) return null
    const index = Number(answer)
    if (Number.isInteger(index) && index >= 1 && index <= databases.length) {
      return databases[index - 1]
    }
    const found = databases.find(
      (database) =>
        database.name.toLowerCase() === answer.toLowerCase() ||
        String(database.id).toLowerCase() === answer.toLowerCase(),
    )
    if (found) return found
    console.log('Pilihan tidak dikenali. Coba lagi.')
  }
}

async function chooseBucket(buckets) {
  while (true) {
    const answer = await ask(
      'Pilih nomor atau ketik nama bucket (kosong untuk batal)',
    )
    if (!answer) return null
    const index = Number(answer)
    if (Number.isInteger(index) && index >= 1 && index <= buckets.length) {
      return buckets[index - 1]
    }
    const found = buckets.find(
      (bucket) => bucket.toLowerCase() === answer.toLowerCase(),
    )
    if (found) return found
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(answer)) {
      console.log('Nama bucket R2 tidak valid. Coba lagi.')
      continue
    }
    const confirm = await ask(
      `Bucket "${answer}" tidak ada di daftar. Gunakan tetap? (y/n)`,
      'n',
    )
    if (/^y/i.test(confirm)) return answer
  }
}

async function selectExisting() {
  const databaseOption = optionValue('--d1')
  const bucketOption = optionValue('--r2')
  const workerOption = optionValue('--worker')

  if (!process.stdin.isTTY && (!databaseOption || !bucketOption)) {
    fail(
      'Mode --existing memerlukan --d1 dan --r2 saat dijalankan tanpa terminal interaktif.',
    )
  }

  const databases = listDatabases()
  let database = null
  if (databaseOption) {
    database = databases.find(
      (row) =>
        row.name.toLowerCase() === databaseOption.toLowerCase() ||
        String(row.id).toLowerCase() === databaseOption.toLowerCase(),
    )
    if (!database) {
      fail(`Database D1 "${databaseOption}" tidak ditemukan di akun ini.`)
    }
  } else if (databases.length === 0) {
    console.log('Tidak ada database D1 di akun ini; resource baru akan dibuat.')
    return null
  } else {
    console.log('\nDatabase D1 yang tersedia:')
    databases.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (${row.id})`)
    })
    database = await chooseDatabase(databases)
    if (!database) return null
  }

  let bucket = bucketOption ?? null
  if (!bucket) {
    const buckets = listBuckets()
    if (buckets.length === 0) {
      bucket = await ask('Nama bucket R2 yang sudah ada (kosong untuk batal)')
    } else {
      console.log('\nBucket R2 yang tersedia:')
      buckets.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`)
      })
      bucket = await chooseBucket(buckets)
    }
  }
  if (!bucket) return null

  const defaultWorker = readWorkerName()
  let workerName = workerOption
  if (!workerName) {
    workerName = await ask('Nama Worker yang sudah ada', defaultWorker)
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workerName)) {
    fail(
      'Nama Worker hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
    )
  }

  console.log('\nResource yang dipilih:')
  console.log(`  Worker : ${workerName}`)
  console.log(`  D1     : ${database.name} (${database.id})`)
  console.log(`  R2     : ${bucket}`)

  writeConfig({
    workerName,
    databaseName: database.name,
    databaseId: database.id,
    bucketName: bucket,
  })

  return { workerName, databaseName: database.name }
}

function updateSection(config, key, updater) {
  const start = config.indexOf(`"${key}"`)
  if (start === -1) fail(`Bagian ${key} tidak ditemukan di wrangler.jsonc.`)
  const end = config.indexOf(']', start)
  if (end === -1) fail(`Bagian ${key} tidak lengkap di wrangler.jsonc.`)
  return (
    config.slice(0, start) + updater(config.slice(start, end)) + config.slice(end)
  )
}

function writeConfig({ workerName, databaseName, databaseId, bucketName }) {
  let config = readFileSync(CONFIG_PATH, 'utf8')

  if (workerName) {
    config = config.replace(/("name"\s*:\s*)"[^"]*"/, `$1"${workerName}"`)
  }

  if (databaseName || databaseId) {
    config = config.replace(
      /\/\/\s*Tanpa database_id:[^\n]*/,
      '// Resource ID ditulis oleh skrip setup (hapus untuk auto-provisioning).',
    )
    config = updateSection(config, 'd1_databases', (section) => {
      if (databaseName) {
        section = section.replace(
          /("database_name"\s*:\s*)"[^"]*"/,
          `$1"${databaseName}"`,
        )
      }
      if (databaseId) {
        if (/"database_id"\s*:/.test(section)) {
          section = section.replace(
            /("database_id"\s*:\s*)"[^"]*"/,
            `$1"${databaseId}"`,
          )
        } else {
          section = section.replace(
            /("database_name"\s*:\s*"[^"]*")/,
            `$1,\n\t\t\t"database_id": "${databaseId}"`,
          )
        }
      }
      return section
    })
  }

  if (bucketName) {
    config = updateSection(config, 'r2_buckets', (section) =>
      section.replace(/("bucket_name"\s*:\s*)"[^"]*"/, `$1"${bucketName}"`),
    )
  }

  writeFileSync(CONFIG_PATH, config)
  console.log('\nKonfigurasi wrangler.jsonc diperbarui.')
}

function ensureD1() {
  console.log(`\nMemeriksa database D1 "${D1_NAME}"…`)
  let database = listDatabases().find((row) => row.name === D1_NAME)
  if (!database) {
    console.log(`Database belum ada. Membuat "${D1_NAME}"…`)
    run(npx, ['wrangler', 'd1', 'create', D1_NAME])
    database = listDatabases().find((row) => row.name === D1_NAME)
  }
  if (!database) {
    fail(
      'Database D1 tidak dapat dibuat atau ditemukan. Coba jalankan lagi, atau buat manual: npx wrangler d1 create ' +
        D1_NAME,
    )
  }
  console.log(`Database D1 siap (${database.id}).`)
  return database
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
  return R2_NAME
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

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    printHelp()
    return
  }

  console.log('Shopilliate — setup Cloudflare')
  ensureLogin()

  const mode = await chooseMode()
  if (mode === 'existing') {
    const selection = await selectExisting()
    if (selection) {
      deploy()
      return
    }
    console.log('\nPemilihan dibatalkan. Melanjutkan dengan resource baru.')
  }

  const database = ensureD1()
  const bucket = ensureR2()
  writeConfig({
    databaseName: database.name,
    databaseId: database.id,
    bucketName: bucket,
  })
  deploy()
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
