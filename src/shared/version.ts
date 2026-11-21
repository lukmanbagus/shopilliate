import appConfig from './app-config.json'

export const APP_VERSION: string = appConfig.version
export const UPDATE_REPO: string = appConfig.repository

export function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, '')
}

/** Returns 1 when a > b, -1 when a < b, and 0 when equal. */
export function compareVersions(a: string, b: string): number {
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

export function isUpdateAvailable(
  currentVersion: string,
  latestVersion: string,
): boolean {
  return compareVersions(latestVersion, currentVersion) > 0
}
