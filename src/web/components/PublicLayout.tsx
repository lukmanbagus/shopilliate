import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Outlet } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useLanguage } from '../lib/language'
import { ProductLayoutProvider } from '../lib/productLayout'
import type { PublicHomeData } from '../../shared/types'
import SiteHeader from './SiteHeader'
import { PublicPageSkeleton } from './Skeleton'
import { SiteFooter } from './SiteFooter'

const SiteContext = createContext<PublicHomeData | null>(null)

export function useSite(): PublicHomeData {
  const value = useContext(SiteContext)
  if (!value) throw new Error('useSite harus dipakai di dalam PublicLayout')
  return value
}

export default function PublicLayout() {
  const { t } = useLanguage()
  const [home, setHome] = useState<PublicHomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setHome(null)
    setError(null)
    api
      .home()
      .then((data) => {
        if (active) setHome(data)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError
            ? err.message
            : t('Tidak dapat memuat etalase. Silakan coba lagi.'),
        )
      })
    return () => {
      active = false
    }
  }, [attempt])

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold">{t('Etalase gagal dimuat')}</h1>
        <p className="text-muted text-sm">{error}</p>
        <button
          onClick={() => setAttempt((value) => value + 1)}
          className="bg-primary mt-2 min-h-11 rounded-lg px-5 text-sm font-bold text-on-primary"
        >
          {t('Coba lagi')}
        </button>
      </main>
    )
  }

  if (!home) {
    return (
      <div>
        <div className="border-line border-b bg-card">
          <div className="bg-line/30 mx-auto mb-3 h-16 max-w-6xl animate-pulse" />
        </div>
        <PublicPageSkeleton />
      </div>
    )
  }

  const { settings, categories } = home

  return (
    <SiteContext.Provider value={home}>
      <ProductLayoutProvider>
        <div className="flex min-h-screen flex-col">
          {settings.bannerText && (
            <p className="bg-primary-soft text-[11px] font-semibold tracking-wide text-primary-ink">
              <span className="mx-auto block max-w-6xl px-4 py-1.5 text-center">
                {settings.bannerText}
              </span>
            </p>
          )}
          <SiteHeader siteName={settings.siteName} categories={categories} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
            <Outlet />
          </main>
          <SiteFooter
            siteName={settings.siteName}
            disclosure={settings.affiliateDisclosure}
          />
        </div>
      </ProductLayoutProvider>
    </SiteContext.Provider>
  )
}
