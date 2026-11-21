import { spawnSync } from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
export const isWindows = process.platform === 'win32'
export const npx = isWindows ? 'npx.cmd' : 'npx'
export const npm = isWindows ? 'npm.cmd' : 'npm'

let selectedAccountId

export function wranglerEnv() {
  return selectedAccountId
    ? { ...process.env, CLOUDFLARE_ACCOUNT_ID: selectedAccountId }
    : process.env
}

export function run(command, commandArgs, env = process.env) {
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

export function capture(command, commandArgs, env = process.env) {
  return spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8', env })
}

export function wranglerRun(commandArgs) {
  return run(npx, ['wrangler', ...commandArgs], wranglerEnv())
}

export function wranglerCapture(commandArgs) {
  return capture(npx, ['wrangler', ...commandArgs], wranglerEnv())
}

export function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

export async function ask(question, defaultValue = '') {
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

export function parseAccounts(output) {
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

export function fetchLoginState() {
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

export async function ensureAccount(requestedAccount) {
  console.log('Checking your Cloudflare login…')
  let state = fetchLoginState()
  if (!state.loggedIn) {
    console.log('Not signed in. Opening the Cloudflare login page…')
    run(npx, ['wrangler', 'login'])
    state = fetchLoginState()
    if (!state.loggedIn) fail('Cloudflare login could not be verified.')
  }
  console.log('Cloudflare login detected.')

  if (requestedAccount) {
    const match = state.accounts.find(
      (account) =>
        account.id.toLowerCase() === requestedAccount.toLowerCase() ||
        account.name.toLowerCase() === requestedAccount.toLowerCase(),
    )
    if (!match) {
      fail(`Cloudflare account "${requestedAccount}" was not found.`)
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

export function deployWorker({ setup = false } = {}) {
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
    console.log(
      setup
        ? `Open ${url} to finish the admin setup.`
        : `Open ${url} to view your site.`,
    )
  } else {
    console.log(
      setup
        ? 'Open your Worker URL in the Cloudflare dashboard to finish the admin setup.'
        : 'Open your Worker URL in the Cloudflare dashboard to view your site.',
    )
  }
  if (setup) {
    console.log(
      'Open that URL right away so nobody else can create the admin account first.',
    )
  }
  console.log('──────────────────────────────────────────')

  return url
}
