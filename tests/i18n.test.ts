import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  languageFromHeader,
  normalizeLanguage,
  translate,
} from '../src/shared/i18n'

describe('i18n', () => {
  it('memakai Bahasa Inggris sebagai default', () => {
    expect(DEFAULT_LANGUAGE).toBe('en')
    expect(normalizeLanguage(undefined)).toBe('en')
    expect(normalizeLanguage('fr')).toBe('en')
    expect(normalizeLanguage('id')).toBe('id')
  })

  it('menerjemahkan teks sumber Bahasa Indonesia ke Inggris', () => {
    expect(translate('en', 'Produk')).toBe('Products')
    expect(translate('id', 'Produk')).toBe('Produk')
  })

  it('mendukung interpolasi variabel', () => {
    expect(translate('en', '{count} produk', { count: 3 })).toBe('3 products')
    expect(translate('id', '{count} produk', { count: 3 })).toBe('3 produk')
    expect(
      translate('en', 'Halaman {page} dari {total}', { page: 2, total: 5 }),
    ).toBe('Page 2 of 5')
  })

  it('mengembalikan teks asli untuk kunci yang belum diterjemahkan', () => {
    expect(translate('en', 'Teks yang belum ada terjemahannya')).toBe(
      'Teks yang belum ada terjemahannya',
    )
  })

  it('membaca Accept-Language dengan fallback Inggris', () => {
    expect(languageFromHeader('id-ID,id;q=0.9')).toBe('id')
    expect(languageFromHeader('id')).toBe('id')
    expect(languageFromHeader('en-US,en;q=0.9')).toBe('en')
    expect(languageFromHeader(null)).toBe('en')
  })
})
