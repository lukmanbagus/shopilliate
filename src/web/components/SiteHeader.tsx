import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Category } from '../../shared/types'
import { useLanguage } from '../lib/language'
import CategoryChips from './CategoryChips'

export default function SiteHeader({
  siteName,
  categories,
}: {
  siteName: string
  categories: Category[]
}) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    navigate(`/cari?q=${encodeURIComponent(value)}`)
  }

  return (
    <header className="border-line sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          to="/"
          className="shrink-0 text-xl font-extrabold tracking-tight"
          aria-label={t('{siteName} — beranda', { siteName })}
        >
          {siteName}
          <span className="text-primary">.</span>
        </Link>

        <form
          onSubmit={handleSearch}
          role="search"
          className="order-last flex w-full min-w-0 flex-1 sm:order-none sm:w-auto"
        >
          <label htmlFor="search-input" className="sr-only">
            {t('Cari produk')}
          </label>
          <input
            id="search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Cari produk pilihan…')}
            className="border-primary focus:ring-primary/20 min-h-11 w-full min-w-0 rounded-l-full border-2 border-r-0 bg-card pr-3 pl-4 text-sm outline-none focus:ring-2"
          />
          <button
            type="submit"
            aria-label={t('Cari')}
            className="bg-primary flex min-h-11 min-w-11 items-center justify-center rounded-r-full px-4 text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>

      <div className="mx-auto w-full max-w-6xl px-2 pb-1">
        <CategoryChips categories={categories} />
      </div>
    </header>
  )
}
