function stripJsonComments(text) {
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    const next = text[index + 1]

    if (inString) {
      output += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
      output += char
      continue
    }

    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') index++
      output += '\n'
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      while (
        index < text.length &&
        !(text[index] === '*' && text[index + 1] === '/')
      ) {
        index++
      }
      index++
      continue
    }

    output += char
  }

  return output
}

export function parseJsonc(text) {
  const withoutComments = stripJsonComments(text)
  const withoutTrailingCommas = withoutComments.replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(withoutTrailingCommas)
}

export function mergeWranglerConfig(localText, upstreamText) {
  const local = parseJsonc(localText)
  const merged = structuredClone(parseJsonc(upstreamText))

  if (typeof local.name === 'string') merged.name = local.name

  const localDatabase = (local.d1_databases ?? []).find(
    (entry) => entry.binding === 'DB',
  )
  const mergedDatabase = (merged.d1_databases ?? []).find(
    (entry) => entry.binding === 'DB',
  )
  if (localDatabase && mergedDatabase) {
    if (localDatabase.database_name) {
      mergedDatabase.database_name = localDatabase.database_name
    }
    if (localDatabase.database_id) {
      mergedDatabase.database_id = localDatabase.database_id
    }
  }

  const localBucket = (local.r2_buckets ?? []).find(
    (entry) => entry.binding === 'BUCKET',
  )
  const mergedBucket = (merged.r2_buckets ?? []).find(
    (entry) => entry.binding === 'BUCKET',
  )
  if (localBucket?.bucket_name && mergedBucket) {
    mergedBucket.bucket_name = localBucket.bucket_name
  }

  if (local.vars || merged.vars) {
    merged.vars = { ...(merged.vars ?? {}), ...(local.vars ?? {}) }
  }

  return merged
}

export function normalizeVersion(value) {
  return String(value).trim().replace(/^v/i, '')
}

export function compareVersions(a, b) {
  const left = normalizeVersion(a).split('.')
  const right = normalizeVersion(b).split('.')
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index++) {
    const leftPart = Number.parseInt(left[index] ?? '0', 10) || 0
    const rightPart = Number.parseInt(right[index] ?? '0', 10) || 0
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1
  }
  return 0
}

export function isNewerVersion(latest, current) {
  return compareVersions(latest, current) > 0
}

export async function fetchLatestRelease(repository, { timeoutMs = 15000 } = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error('Invalid repository format. Use "owner/repo".')
  }

  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/latest`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'shopilliate-updater',
      },
      signal: AbortSignal.timeout(timeoutMs),
    },
  )

  if (!response.ok) return null

  const release = await response.json()
  if (!release?.tag_name || release.draft) return null

  return {
    tag: release.tag_name,
    version: normalizeVersion(release.tag_name),
    tarballUrl: release.tarball_url ?? null,
    releaseUrl: release.html_url ?? null,
    publishedAt: release.published_at ?? null,
  }
}
