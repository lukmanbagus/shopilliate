import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canonicalShopeeUrl,
  isAllowedImageHost,
  isAllowedImageUrl,
  isAllowedShopeeUrl,
  parsePrice,
} from '../src/worker/lib/validate'
import {
  extractShopeeIds,
  resolveShopeeProductUrl,
  ShopeeError,
} from '../src/worker/lib/shopee/resolve'

function url(value: string): URL {
  return new URL(value)
}

describe('ekstraksi shop_id dan item_id', () => {
  const cases: Array<[string, string, string]> = [
    ['https://shopee.co.id/product/123456/987654', '123456', '987654'],
    ['https://shopee.co.id/product/123456/987654/', '123456', '987654'],
    ['https://shopee.co.id/Kabel-USB-C-i.123456.987654', '123456', '987654'],
    [
      'https://shopee.co.id/Kabel-USB-C-i.123456.987654?sp_atk=abc',
      '123456',
      '987654',
    ],
    [
      'https://www.shopee.co.id/Nama-Produk-Panjang-i.555.666#detail',
      '555',
      '666',
    ],
  ]

  for (const [value, shopId, itemId] of cases) {
    it(`mengenali ${value}`, () => {
      const canonical = canonicalShopeeUrl(value)
      expect(canonical).not.toBeNull()
      expect(extractShopeeIds(canonical!)).toEqual({ shopId, itemId })
    })
  }

  it('tidak salah mengenali halaman toko atau pencarian', () => {
    expect(extractShopeeIds(url('https://shopee.co.id/shop/123'))).toBeNull()
    expect(extractShopeeIds(url('https://shopee.co.id/search?keyword=usb'))).toBeNull()
    expect(extractShopeeIds(url('https://shopee.co.id/product/123'))).toBeNull()
  })
})

describe('validasi domain Shopee (anti SSRF)', () => {
  it('mengizinkan hanya domain dan protokol yang diizinkan', () => {
    for (const value of [
      'https://shopee.co.id/product/1/2',
      'https://s.shopee.co.id/abc',
      'https://shp.ee/abc',
      'https://id.shp.ee/abc',
      'https://www.shopee.co.id/product/1/2',
    ]) {
      const parsed = canonicalShopeeUrl(value)
      expect(parsed, value).not.toBeNull()
      expect(isAllowedShopeeUrl(parsed!), value).toBe(true)
    }
  })

  it('menolak domain mirip, IP, port, userinfo, dan http', () => {
    for (const value of [
      'http://shopee.co.id/product/1/2',
      'https://shopee.co.id.evil.test/product/1/2',
      'https://evilshopee.co.id/product/1/2',
      'https://shopee.co.id:444/product/1/2',
      'https://user:pass@shopee.co.id/product/1/2',
      'https://127.0.0.1/product/1/2',
      'https://shopee.com/product/1/2',
    ]) {
      expect(canonicalShopeeUrl(value), value).toBeNull()
    }
  })

  it('mengizinkan gambar hanya dari CDN Shopee', () => {
    expect(isAllowedImageHost('down-id.img.susercontent.com')).toBe(true)
    expect(isAllowedImageHost('cf.shopee.co.id')).toBe(true)
    expect(isAllowedImageHost('susercontent.com.evil.test')).toBe(false)
    expect(isAllowedImageHost('127.0.0.1')).toBe(false)
    expect(
      isAllowedImageUrl(url('https://down-id.img.susercontent.com/file/abc')),
    ).toBe(true)
    expect(
      isAllowedImageUrl(url('http://down-id.img.susercontent.com/file/abc')),
    ).toBe(false)
  })
})

describe('resolveShopeeProductUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('menyelesaikan link produk langsung tanpa permintaan jaringan', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveShopeeProductUrl(
      'https://shopee.co.id/Kabel-USB-i.123.456?utm=1',
    )
    expect(result.shopId).toBe('123')
    expect(result.itemId).toBe('456')
    expect(result.productUrl).toBe('https://shopee.co.id/product/123/456')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mengikuti redirect link pendek hingga menemukan id produk', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: 'https://shopee.co.id/product/11/22' },
        }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveShopeeProductUrl('https://shp.ee/abc')
    expect(result.shopId).toBe('11')
    expect(result.itemId).toBe('22')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('menolak redirect ke domain di luar allowlist', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: 'https://169.254.169.254/latest/meta-data' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(resolveShopeeProductUrl('https://shp.ee/abc')).rejects.toMatchObject({
      code: 'INVALID_DOMAIN',
    })
  })

  it('menolak link pendek tanpa id produk setelah batas redirect', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { Location: 'https://shp.ee/loop' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(resolveShopeeProductUrl('https://shp.ee/loop')).rejects.toBeInstanceOf(
      ShopeeError,
    )
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(6)
  })

  it('menolak domain non-Shopee dengan pesan bahasa Indonesia', async () => {
    await expect(
      resolveShopeeProductUrl('https://contoh.com/product/1/2'),
    ).rejects.toMatchObject({
      code: 'INVALID_DOMAIN',
      message: expect.stringContaining('Shopee'),
    })
  })
})

describe('parsePrice', () => {
  it('menangani format API, Rupiah, dan angka polos', () => {
    expect(parsePrice('150000.00')).toBe(150000)
    expect(parsePrice('Rp150.000')).toBe(150000)
    expect(parsePrice('1.250.000')).toBe(1250000)
    expect(parsePrice(25000)).toBe(25000)
    expect(parsePrice('tidak ada')).toBeNull()
    expect(parsePrice(undefined)).toBeNull()
  })
})
