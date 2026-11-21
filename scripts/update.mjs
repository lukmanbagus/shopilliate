#!/usr/bin/env node
/**
 * Update Shopilliate from the latest GitHub Release:
 * - preserves wrangler.jsonc resource IDs, local vars, .dev.vars, and data;
 * - backs up wrangler.jsonc before changes;
 * - installs dependencies, builds, and deploys.
 */
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  root,
  npm,
  fail,
  ask,
  run,
  ensureAccount,
  deployWorker,
} from './lib/cloudflare.mjs'
import {
  fetchLatestRelease,
  isNewerVersion,
  mergeWranglerConfig,
} from './lib/updater.mjs'

const CONFIG_PATH = path.join(root, 'wrangler.jsonc')
const APP_CONFIG_PATH = path.join(root, 'src/shared/app-config.json')

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
  console.log(`Shopilliate — update from the latest GitHub Release

Usage:
  npm run update
  npm run update -- --check
  npm run update -- --yes --account <name|id>

Options:
  --check        Only check the latest release; do not change files
  --force        Reinstall the latest release even if the version matches
  --yes          Skip the confirmation prompt (required without a terminal)
  --account      Cloudflare account name or ID
  -h, --help     Show this help

The updater preserves wrangler.jsonc resource IDs and vars, .dev.vars, .env
files, local data directories, and your D1/R2 data. A backup of wrangler.jsonc
is written to .update-backup/ before any files are replaced.`)
}

function readAppConfig() {
  return JSON.parse(readFileSync(APP_CONFIG_PATH, 'utf8'))
}

async function download(url, destination) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': 'shopilliate-updater',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) {
    fail(`Could not download the release archive (HTTP ${response.status}).`)
  }
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()))
}

function extractArchive(archive, destination) {
  mkdirSync(destination, { recursive: true })
  const result = spawnSync('tar', ['-xzf', archive, '-C', destination], {
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    fail('Could not extract the release archive. Make sure "tar" is available.')
  }
}

function findExtractedRoot(directory) {
  const candidates = readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter(
      (entry) =>
        statSync(entry).isDirectory() &&
        existsSync(path.join(entry, 'package.json')),
    )
  if (candidates.length !== 1) {
    fail('The release archive did not contain a single project directory.')
  }
  return candidates[0]
}

function shouldPreserve(name) {
  if (
    [
      '.git',
      'node_modules',
      'dist',
      '.wrangler',
      '.env',
      '.commandcode',
      '.update-backup',
      'wrangler.jsonc',
    ].includes(name)
  ) {
    return true
  }
  return (
    name === '.dev.vars' ||
    name.startsWith('.dev.vars.') ||
    name.startsWith('.env.')
  )
}

function backupConfig() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const directory = path.join(root, '.update-backup', stamp)
  mkdirSync(directory, { recursive: true })
  if (existsSync(CONFIG_PATH)) {
    cpSync(CONFIG_PATH, path.join(directory, 'wrangler.jsonc'))
  }
  if (existsSync(APP_CONFIG_PATH)) {
    cpSync(APP_CONFIG_PATH, path.join(directory, 'app-config.json'))
  }
  console.log(`Backup written to ${path.relative(root, directory)}.`)
}

function replaceProjectFiles(extracted) {
  for (const entry of readdirSync(extracted)) {
    if (shouldPreserve(entry)) continue
    const source = path.join(extracted, entry)
    const destination = path.join(root, entry)
    rmSync(destination, { recursive: true, force: true })
    cpSync(source, destination, { recursive: true })
  }
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    printHelp()
    return
  }

  const localConfig = readAppConfig()
  const repository = localConfig.repository
  const currentVersion = localConfig.version

  if (typeof repository !== 'string' || typeof currentVersion !== 'string') {
    fail('src/shared/app-config.json must contain "version" and "repository".')
  }

  console.log(`Shopilliate — update from GitHub Releases`)
  console.log(`Repository: ${repository}`)
  console.log(`Current version: v${currentVersion}`)

  const release = await fetchLatestRelease(repository).catch((error) => {
    fail(`Could not check GitHub releases: ${error.message}`)
  })

  if (!release) {
    console.log('No published GitHub releases were found. Nothing to update.')
    return
  }

  console.log(`Latest release: v${release.version} (${release.tag})`)
  if (release.releaseUrl) console.log(`Release notes: ${release.releaseUrl}`)

  const newer = isNewerVersion(release.version, currentVersion)

  if (hasFlag('--check')) {
    console.log(
      newer
        ? 'Update available. Run "npm run update" to install it.'
        : 'Already up to date.',
    )
    return
  }

  if (!newer && !hasFlag('--force')) {
    console.log('Already up to date. Nothing to do.')
    return
  }

  if (!hasFlag('--yes')) {
    if (!process.stdin.isTTY) {
      fail('Pass --yes to update without an interactive terminal.')
    }
    const answer = await ask(
      `Update to v${release.version} and deploy now? (y/N)`,
      'n',
    )
    if (!/^y/i.test(answer)) {
      console.log('Cancelled.')
      return
    }
  }

  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'shopilliate-update-'),
  )
  const archive = path.join(tempDirectory, 'release.tar.gz')
  const sourceDirectory = path.join(tempDirectory, 'source')

  try {
    const url =
      release.tarballUrl ??
      `https://codeload.github.com/${repository}/tar.gz/refs/tags/${encodeURIComponent(release.tag)}`
    console.log('\nDownloading the release…')
    await download(url, archive)
    extractArchive(archive, sourceDirectory)
    const extracted = findExtractedRoot(sourceDirectory)

    const upstreamConfig = readFileSync(
      path.join(extracted, 'wrangler.jsonc'),
      'utf8',
    )
    const localConfigText = readFileSync(CONFIG_PATH, 'utf8')

    backupConfig()

    console.log('\nApplying release files…')
    replaceProjectFiles(extracted)

    const merged = mergeWranglerConfig(localConfigText, upstreamConfig)
    writeFileSync(CONFIG_PATH, `${JSON.stringify(merged, null, 2)}\n`)
    console.log('wrangler.jsonc merged (resource IDs and local vars preserved).')

    const installedConfig = readAppConfig()
    console.log(`Files updated to v${installedConfig.version}.`)

    console.log('\nInstalling dependencies…')
    run(npm, ['install'])

    await ensureAccount(optionValue('--account'))
    deployWorker()

    console.log(
      `\nUpdated to v${installedConfig.version}. Your database, images, and resource configuration were preserved.`,
    )
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true })
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
