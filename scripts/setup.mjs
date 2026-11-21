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

let selectedAccountId

function wranglerEnv() {
  return selectedAccountId
    ? { ...process.env, CLOUDFLARE_ACCOUNT_ID: selectedAccountId }
    : process.env
}

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
  --account     Cloudflare account name or ID
  --d1          Existing D1 database name or UUID
  --r2          Existing R2 bucket name
  --worker      Worker name to deploy (defaults to wrangler.jsonc)
  -h, --help    Show this help

When run in a terminal without flags, you will be asked whether to create new
resources or reuse an existing deployment. If more than one Cloudflare account
is available, you will be asked which account to use. Pass --account to skip
that prompt. No credentials are stored; only database IDs and resource names
are written to wrangler.jsonc.`)
}

function run(command, commandArgs, env = process.env) {
  console.log(`\n→ ${command} ${commandArgs.join(' ')}`)
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env,
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}`)
  }
}

function capture(command, commandArgs, env = process.env) {
  return spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8', env })
}

function wranglerRun(commandArgs) {
  return run(npx, ['wrangler', ...commandArgs], wranglerEnv())
}

function wranglerCapture(commandArgs) {
  return capture(npx, ['wrangler', ...commandArgs], wranglerEnv())
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

function parseAccounts(output) {
  const accounts = new Map()
  for (const line of output.split('\n')) {
    if (!line.includes('│')) continue
    const cells = line
      .split('│')
      .map((cell) => cell.trim())
      .filter(Boolean)
    if (cells.length !== 2) continue
    const [name, id] = cells
    if (/^account name$/i.test(name) || /^[-─]+$/.test(name)) continue
    if (!/^[0-9a-f]{32}$/i.test(id)) continue
    accounts.set(id.toLowerCase(), { name, id })
  }
  return [...accounts.values()]
}

function fetchLoginState() {
  const result = capture(npx, ['wrangler', 'whoami'])
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  if (
    result.status !== 0 ||
    /not (logged|signed) in|not authenticated|please log in/i.test(output)
  ) {
    return { loggedIn: false, accounts: [] }
  }
  return { loggedIn: true, accounts: parseAccounts(output) }
}

async function ensureAccount() {
  console.log('Checking your Cloudflare login…')
  let state = fetchLoginState()
  if (!state.loggedIn) {
    console.log('Not signed in. Opening the Cloudflare login page…')
    run(npx, ['wrangler', 'login'])
    state = fetchLoginState()
    if (!state.loggedIn) fail('Cloudflare login could not be verified.')
  }
  console.log('Cloudflare login detected.')

  const requested = optionValue('--account')
  if (requested) {
    const match = state.accounts.find(
      (account) =>
        account.id.toLowerCase() === requested.toLowerCase() ||
        account.name.toLowerCase() === requested.toLowerCase(),
    )
    if (!match) {
      fail(`Cloudflare account "${requested}" was not found.`)
    }
    selectedAccountId = match.id
    console.log(`Using Cloudflare account: ${match.name} (${match.id})`)
    return
  }

  if (state.accounts.length === 0) {
    console.log(
      'Wrangler did not return an account list; using the current Wrangler account.',
    )
    return
  }

  if (state.accounts.length === 1) {
    selectedAccountId = state.accounts[0].id
    console.log(
      `Using Cloudflare account: ${state.accounts[0].name} (${state.accounts[0].id})`,
    )
    return
  }

  console.log('\nMultiple Cloudflare accounts found:')
  state.accounts.forEach((account, index) => {
    console.log(`  ${index + 1}. ${account.name} (${account.id})`)
  })

  if (!process.stdin.isTTY) {
    fail(
      'Multiple Cloudflare accounts found. Pass --account <name|id> to choose one.',
    )
  }

  while (true) {
    const answer = await ask('Choose an account', '1')
    const index = Number(answer)
    if (
      Number.isInteger(index) &&
      index >= 1 &&
      index <= state.accounts.length
    ) {
      const account = state.accounts[index - 1]
      selectedAccountId = account.id
      console.log(`Using Cloudflare account: ${account.name} (${account.id})`)
      return
    }
    const match = state.accounts.find(
      (account) =>
        account.id.toLowerCase() === answer.toLowerCase() ||
        account.name.toLowerCase() === answer.toLowerCase(),
    )
    if (match) {
      selectedAccountId = match.id
      console.log(`Using Cloudflare account: ${match.name} (${match.id})`)
      return
    }
    console.log('Unknown choice. Try again.')
  }
}

function listDatabases() {
  const result = wranglerCapture(['d1', 'list', '--json'])
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
  const json = wranglerCapture(['r2', 'bucket', 'list', '--json'])
  if (json.status === 0) {
    try {
      const parsed = JSON.parse(json.stdout)
      const rows = Array.isArray(parsed) ? parsed : (parsed.result ?? [])
      const names = rows
        .map((row) => (typeof row === 'string' ? row : row.name))
        .filter(Boolean)
      if (names.length) return names
    } catch {
      // Fall through to parsing the plain-text output.
    }
  }

  const plain = wranglerCapture(['r2', 'bucket', 'list'])
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
    fail('Choose either --new or --existing.')
  }
  if (hasFlag('--new')) return 'new'
  if (hasFlag('--existing')) return 'existing'
  if (!process.stdin.isTTY) return 'new'

  console.log('\nHow should Cloudflare resources be prepared?')
  console.log('  1. Create new resources (D1 + R2)')
  console.log('  2. Use an existing deployment (choose D1 + R2)')
  const answer = await ask('Choose 1 or 2', '1')
  return answer === '2' ? 'existing' : 'new'
}

async function chooseDatabase(databases) {
  while (true) {
    const answer = await ask(
      'Enter a number or database name (leave empty to cancel)',
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
    console.log('Unknown choice. Try again.')
  }
}

async function chooseBucket(buckets) {
  while (true) {
    const answer = await ask(
      'Enter a number or bucket name (leave empty to cancel)',
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
      console.log('Invalid R2 bucket name. Try again.')
      continue
    }
    const confirm = await ask(
      `Bucket "${answer}" is not in the list. Use it anyway? (y/n)`,
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
      'Mode --existing requires --d1 and --r2 when running without an interactive terminal.',
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
      fail(`Database "${databaseOption}" was not found in this account.`)
    }
  } else if (databases.length === 0) {
    console.log('No D1 databases found in this account; new resources will be created.')
    return null
  } else {
    console.log('\nAvailable D1 databases:')
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
      bucket = await ask('Existing R2 bucket name (leave empty to cancel)')
    } else {
      console.log('\nAvailable R2 buckets:')
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
    workerName = await ask('Existing Worker name', defaultWorker)
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workerName)) {
    fail('Worker names may only contain lowercase letters, numbers, and hyphens.')
  }

  console.log('\nSelected resources:')
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
  if (start === -1) fail(`Section ${key} not found in wrangler.jsonc.`)
  const end = config.indexOf(']', start)
  if (end === -1) fail(`Section ${key} is incomplete in wrangler.jsonc.`)
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
      /\/\/\s*Without database_id[^\n]*/,
      '// Resource IDs are written by the setup script (remove them to use auto-provisioning).',
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
  console.log('\nwrangler.jsonc updated.')
}

function ensureD1() {
  console.log(`\nChecking D1 database "${D1_NAME}"…`)
  let database = listDatabases().find((row) => row.name === D1_NAME)
  if (!database) {
    console.log(`Database not found. Creating "${D1_NAME}"…`)
    wranglerRun(['d1', 'create', D1_NAME])
    database = listDatabases().find((row) => row.name === D1_NAME)
  }
  if (!database) {
    fail(
      'The D1 database could not be created or found. Try again, or create it manually: npx wrangler d1 create ' +
        D1_NAME,
    )
  }
  console.log(`D1 database ready (${database.id}).`)
  return database
}

function ensureR2() {
  console.log(`\nChecking R2 bucket "${R2_NAME}"…`)
  const result = wranglerCapture(['r2', 'bucket', 'create', R2_NAME])
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0 && !/already exists|already own/i.test(output)) {
    fail(
      'The R2 bucket could not be created. Make sure R2 is enabled on your Cloudflare account (R2 has a free tier).',
    )
  }
  console.log(`R2 bucket ready: ${R2_NAME}.`)
  return R2_NAME
}

function deploy() {
  console.log('\nBuilding the frontend…')
  run(npm, ['run', 'build'])

  console.log('\nDeploying the Worker…')
  const result = wranglerCapture(['deploy'])
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  if (result.status !== 0) fail('Deploy failed. Check the Wrangler output above.')

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  const url = output.match(/https:\/\/[^\s]+\.workers\.dev/i)?.[0]

  console.log('\n──────────────────────────────────────────')
  console.log('Done! The Worker has been deployed.')
  if (url) {
    console.log(`Open ${url} to finish the admin setup.`)
  } else {
    console.log(
      'Open your Worker URL in the Cloudflare dashboard to finish the admin setup.',
    )
  }
  console.log(
    'Open that URL right away so nobody else can create the admin account first.',
  )
  console.log('──────────────────────────────────────────')
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    printHelp()
    return
  }

  console.log('Shopilliate — Cloudflare setup')
  await ensureAccount()

  const mode = await chooseMode()
  if (mode === 'existing') {
    const selection = await selectExisting()
    if (selection) {
      deploy()
      return
    }
    console.log('\nNo existing resources selected. Continuing with new resources.')
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
