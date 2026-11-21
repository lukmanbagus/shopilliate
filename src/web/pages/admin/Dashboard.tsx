import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { imageUrl } from '../../lib/format'
import { useCurrency } from '../../lib/currency'
import { useLanguage } from '../../lib/language'
import type { DashboardData } from '../../../shared/types'

export default function Dashboard() {
  const { t } = useLanguage()
  const { formatPrice } = useCurrency()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api
      .dashboard()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : t('Dashboard gagal dimuat.'),
          )
        }
      })
    return () => {
      active = false
    }
  }, [])

  if (!data && !error) {
    return (
      <div>
        <div className="bg-line/40 h-6 w-40 animate-pulse rounded" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="bg-line/40 h-24 animate-pulse rounded-xl"
            />
          ))}
        </div>
        <div className="bg-line/40 mt-6 h-52 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-line rounded-xl border bg-card px-5 py-10 text-center">
        <p className="font-semibold">{error}</p>
      </div>
    )
  }

  const cards = [
    { label: t('Total produk'), value: data!.totalProducts },
    { label: t('Klik 7 hari'), value: data!.clicks7 },
    { label: t('Klik 30 hari'), value: data!.clicks30 },
  ]

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('Dashboard')}</h1>
          <p className="text-muted mt-1 text-sm">
            {t('Ringkasan performa etalase Anda.')}
          </p>
        </div>
        <Link
          to="/admin/produk/baru"
          className="bg-primary flex min-h-11 items-center rounded-lg px-4 text-sm font-bold text-on-primary hover:opacity-90"
        >
          {t('Tambah Produk')}
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="border-line rounded-xl border bg-card p-4"
          >
            <p className="text-muted text-sm font-medium">{card.label}</p>
            <p className="text-primary-text mt-1 text-3xl font-extrabold">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="border-line mt-6 rounded-xl border bg-card">
        <div className="border-line flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-bold">{t('5 produk terklik')}</h2>
          <Link
            to="/admin/produk"
            className="text-primary-text text-sm font-semibold"
          >
            {t('Kelola produk')}
          </Link>
        </div>
        {data!.topProducts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-semibold">{t('Belum ada produk.')}</p>
            <p className="text-muted mt-1 text-sm">
              {t('Tambahkan produk untuk mulai mengumpulkan klik.')}
            </p>
          </div>
        ) : (
          <ul className="divide-line divide-y">
            {data!.topProducts.map((product, index) => (
              <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-muted w-5 text-sm font-bold">
                  {index + 1}
                </span>
                {imageUrl(product.imageKey) ? (
                  <img
                    src={imageUrl(product.imageKey)!}
                    alt=""
                    width={40}
                    height={40}
                    className="border-line h-10 w-10 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="bg-page text-muted flex h-10 w-10 items-center justify-center rounded-lg text-xs">
                    —
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {product.title}
                  </p>
                  <p className="text-muted text-xs">
                    {formatPrice(product.price)}
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {t('{count} klik', { count: product.clickCount })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
