import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  DEFAULT_THEME_COLOR,
  generateTheme,
  mixColors,
  normalizeHexColor,
  relativeLuminance,
} from '../src/shared/theme'

describe('warna tema', () => {
  it('menormalkan hex pendek, panjang, dan tanpa tanda #', () => {
    expect(normalizeHexColor('#abc')).toBe('#AABBCC')
    expect(normalizeHexColor('f2542d')).toBe('#F2542D')
    expect(normalizeHexColor('  #F2542D  ')).toBe('#F2542D')
    expect(normalizeHexColor('bukan-warna')).toBeNull()
    expect(normalizeHexColor('#12345')).toBeNull()
  })

  it('menghasilkan palet deterministik', () => {
    const first = generateTheme('#2563EB')
    const second = generateTheme('#2563eb')
    expect(first).toEqual(second)
    expect(first.primary).toBe('#2563EB')
  })

  it('membuat warna lembut lebih terang dari warna utama', () => {
    const theme = generateTheme(DEFAULT_THEME_COLOR)
    expect(relativeLuminance(theme.soft)).toBeGreaterThan(
      relativeLuminance(theme.primary),
    )
  })

  it('menggelapkan primary-text sebesar 10% dari warna utama', () => {
    for (const color of ['#F2542D', '#2563EB', '#FFD400', '#111827']) {
      const theme = generateTheme(color)
      expect(theme.text).toBe(mixColors(theme.primary, '#000000', 0.1))
    }
    expect(generateTheme(DEFAULT_THEME_COLOR).text).toBe('#DA4C29')
  })

  it('menjamin kontras ink di atas soft minimal 4.5', () => {
    for (const color of ['#F2542D', '#2563EB', '#FFD400', '#111827']) {
      const theme = generateTheme(color)
      expect(contrastRatio(theme.ink, theme.soft)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('memilih warna teks di atas warna utama yang tetap terbaca', () => {
    for (const color of ['#F2542D', '#FFD400', '#111827']) {
      const theme = generateTheme(color)
      expect(contrastRatio(theme.onPrimary, theme.primary)).toBeGreaterThanOrEqual(3)
    }
  })

  it('memakai warna default untuk input tidak valid', () => {
    expect(generateTheme('tidak-valid').primary).toBe(DEFAULT_THEME_COLOR)
  })
})
