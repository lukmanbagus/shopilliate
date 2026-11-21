import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useLanguage } from '../lib/language'
import ProductGrid from '../components/ProductGrid'
import { ProductGridSkeleton } from '../components/Skeleton'
import type { PublicProductList } from '../../shared/types'

export default function Search() {
  const [params] = useSearchParams()
  const { t } = useLanguage()
  const query = (params.get('q') ?? '').trim()

  const [data, setData] = useState<PublicProductList | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) {
      setData(null)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    api
      .publicProducts({ q: query, limit: 48 })
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError
            ? err.message
            : t('Pencarian gagal. Silakan coba lagi.'),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [query])

  if (!query) {
    return (
      <div className="border-line mt-6 rounded-xl border bg-card px-5 py-12 text-center">
        <p className="font-semibold">{t('Cari produk pilihan')}</p>
        <p className="text-muted mt-1 text-sm">
          {t('Ketik nama produk di kolom pencarian untuk mulai menjelajah.')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mt-5 text-xl font-extrabold sm:text-2xl">
        {t('Hasil pencarian “{query}”', { query })}
      </h1>
      <p className="text-muted mt-0.5 text-sm">
        {error
          ? ' '
          : t('{count} produk ditemukan', { count: data?.total ?? 0 })}
      </p>

      {error ? (
        <div className="border-line mt-4 rounded-xl border bg-card px-5 py-12 text-center">
          <p className="font-semibold">{error}</p>
        </div>
      ) : loading ? (
        <div className="mt-4">
          <ProductGridSkeleton count={8} />
        </div>
      ) : (
        <div className="mt-4">
          <ProductGrid
            products={data?.products ?? []}
            emptyTitle={t('Tidak ada hasil untuk “{query}”.', { query })}
            emptyDescription="Coba kata kunci lain atau jelajahi kategori yang tersedia."
          />
        </div>
      )}
    </div>
  )
}
