import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CURRENCY,
  formatMoney,
  normalizeCurrency,
} from '../src/shared/currency'

describe('mata uang (tampilan saja)', () => {
  it('menormalkan kode mata uang yang didukung', () => {
    expect(normalizeCurrency('usd')).toBe('USD')
    expect(normalizeCurrency(' IDR ')).toBe('IDR')
    expect(normalizeCurrency('XYZ')).toBe(DEFAULT_CURRENCY)
    expect(normalizeCurrency(null)).toBe(DEFAULT_CURRENCY)
  })

  it('memformat IDR tanpa desimal', () => {
    const text = formatMoney(100000, 'IDR')
    expect(text).toContain('Rp')
    expect(text).toContain('100.000')
    expect(text).not.toContain(',00')
  })

  it('memformat nilai apa adanya tanpa konversi', () => {
    expect(formatMoney(100000, 'USD')).toBe('$100,000.00')
    const sgd = formatMoney(100000, 'SGD')
    expect(sgd).toContain('SGD')
    expect(sgd).toContain('100,000.00')
  })

  it('memformat VND tanpa desimal', () => {
    const text = formatMoney(160000, 'VND')
    expect(text).toContain('160,000')
    expect(text).not.toContain('.00')
  })

  it('menggunakan IDR untuk kode mata uang yang tidak didukung', () => {
    const text = formatMoney(50000, 'XYZ')
    expect(text).toContain('Rp')
    expect(text).toContain('50.000')
  })
})
