import { describe, expect, it } from 'vitest'
import {
  APP_VERSION,
  compareVersions,
  isUpdateAvailable,
  normalizeVersion,
} from '../src/shared/version'

describe('versi aplikasi', () => {
  it('membaca versi dari app-config.json', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('menormalkan prefix v pada tag release', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3')
    expect(normalizeVersion('1.2.3')).toBe('1.2.3')
  })

  it('membandingkan versi secara numerik', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
    expect(compareVersions('1.3.0', '1.2.9')).toBe(1)
    expect(compareVersions('1.0.9', '1.0.10')).toBe(-1)
    expect(compareVersions('v2.0.0', '1.9.9')).toBe(1)
  })

  it('hanya mendeteksi update saat release lebih baru', () => {
    expect(isUpdateAvailable('1.0.0', '1.0.1')).toBe(true)
    expect(isUpdateAvailable('1.0.0', '1.0.0')).toBe(false)
    expect(isUpdateAvailable('1.1.0', '1.0.9')).toBe(false)
  })
})
