import { describe, expect, it } from 'vitest'
// @ts-expect-error - updater helpers are plain ESM modules.
import {
  isNewerVersion,
  mergeWranglerConfig,
  parseJsonc,
} from '../scripts/lib/updater.mjs'

const localConfig = `{
  // local Worker settings
  "name": "my-shopilliate",
  "compatibility_date": "2026-11-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-db",
      "database_id": "11111111-2222-3333-4444-555555555555",
    },
  ],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "my-images" }],
  "vars": { "CUSTOM_FLAG": "1" },
}`

const upstreamConfig = `{
  "name": "shopilliate",
  "compatibility_date": "2027-01-01",
  "assets": { "directory": "./dist/client", "binding": "ASSETS" },
  "d1_databases": [{ "binding": "DB", "database_name": "shopilliate-db" }],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "shopilliate-images" }],
  "vars": { "NEW_FEATURE": "on" },
}`

describe('updater helpers', () => {
  it('parses JSONC with comments and trailing commas', () => {
    const parsed = parseJsonc(localConfig)
    expect(parsed.name).toBe('my-shopilliate')
    expect(parsed.d1_databases[0].database_id).toBe(
      '11111111-2222-3333-4444-555555555555',
    )
  })

  it('preserves local identity and resource configuration', () => {
    const merged = mergeWranglerConfig(localConfig, upstreamConfig)
    expect(merged.name).toBe('my-shopilliate')
    expect(merged.d1_databases[0].database_name).toBe('my-db')
    expect(merged.d1_databases[0].database_id).toBe(
      '11111111-2222-3333-4444-555555555555',
    )
    expect(merged.r2_buckets[0].bucket_name).toBe('my-images')
    expect(merged.vars).toEqual({ NEW_FEATURE: 'on', CUSTOM_FLAG: '1' })
  })

  it('takes new upstream features such as compatibility date and assets', () => {
    const merged = mergeWranglerConfig(localConfig, upstreamConfig)
    expect(merged.compatibility_date).toBe('2027-01-01')
    expect(merged.assets.binding).toBe('ASSETS')
  })

  it('compares release versions', () => {
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true)
    expect(isNewerVersion('v1.0.0', '1.0.0')).toBe(false)
  })
})
