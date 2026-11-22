import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRODUCTS_PER_PAGE,
  MAX_PRODUCTS_PER_PAGE,
  MIN_PRODUCTS_PER_PAGE,
  normalizeProductsPerPage,
} from '../src/shared/pagination'

describe('paginasi produk', () => {
  it('memakai nilai default untuk input kosong atau tidak valid', () => {
    expect(normalizeProductsPerPage(undefined)).toBe(DEFAULT_PRODUCTS_PER_PAGE)
    expect(normalizeProductsPerPage(null)).toBe(DEFAULT_PRODUCTS_PER_PAGE)
    expect(normalizeProductsPerPage('')).toBe(DEFAULT_PRODUCTS_PER_PAGE)
    expect(normalizeProductsPerPage('bukan-angka')).toBe(
      DEFAULT_PRODUCTS_PER_PAGE,
    )
    expect(normalizeProductsPerPage(Number.NaN)).toBe(DEFAULT_PRODUCTS_PER_PAGE)
  })

  it('menerima angka valid dan string angka', () => {
    expect(normalizeProductsPerPage(12)).toBe(12)
    expect(normalizeProductsPerPage('18')).toBe(18)
    expect(normalizeProductsPerPage(24.9)).toBe(24)
  })

  it('membatasi nilai di antara batas minimum dan maksimum', () => {
    expect(normalizeProductsPerPage(0)).toBe(MIN_PRODUCTS_PER_PAGE)
    expect(normalizeProductsPerPage(-5)).toBe(MIN_PRODUCTS_PER_PAGE)
    expect(normalizeProductsPerPage(2)).toBe(MIN_PRODUCTS_PER_PAGE)
    expect(normalizeProductsPerPage(100)).toBe(MAX_PRODUCTS_PER_PAGE)
  })
})
