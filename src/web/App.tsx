import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Setup from './pages/Setup'
import Login from './pages/Login'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import CategoryPage from './pages/Category'
import Search from './pages/Search'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Products from './pages/admin/Products'
import ProductForm from './pages/admin/ProductForm'
import Categories from './pages/admin/Categories'
import Settings from './pages/admin/Settings'
import { api, ApiError, setApiLanguage, type SetupStatus } from './lib/api'
import { LanguageProvider, useLanguage } from './lib/language'
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  type Language,
} from '../shared/i18n'
import {
  applyThemeColor,
  DEFAULT_THEME_COLOR,
  normalizeHexColor,
} from '../shared/theme'

function Placeholder({ title }: { title: string }) {
  const { t } = useLanguage()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">
        Shopi<span className="text-primary-text">lliate</span>
      </h1>
      <p className="text-muted text-sm">{t(title)}</p>
    </main>
  )
}

function FullScreenMessage({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry?: () => void
}) {
  const { t } = useLanguage()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-bold">{t(title)}</h1>
      <p className="text-muted text-sm">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-primary mt-2 min-h-11 rounded-lg px-5 text-sm font-bold text-on-primary"
        >
          {t('Coba lagi')}
        </button>
      )}
    </main>
  )
}

export default function App() {
  const location = useLocation()
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE)
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR)

  function changeLanguage(next: Language) {
    const value = normalizeLanguage(next)
    setLanguage(value)
    setApiLanguage(value)
  }

  useEffect(() => {
    setApiLanguage(language)
  }, [language])

  useEffect(() => {
    applyThemeColor(themeColor)
  }, [themeColor])

  useEffect(() => {
    let active = true
    setStatus(null)
    setError(null)
    api
      .setupStatus()
      .then((data) => {
        if (!active) return
        setStatus(data)
        changeLanguage(normalizeLanguage(data.language))
        setThemeColor(normalizeHexColor(data.themeColor) ?? DEFAULT_THEME_COLOR)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError
            ? err.message
            : 'Tidak dapat menghubungi server.',
        )
      })
    return () => {
      active = false
    }
    // changeLanguage hanya bergantung pada setter stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  let content: ReactNode

  if (error) {
    content = (
      <FullScreenMessage
        title="Koneksi gagal"
        description={error}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    )
  } else if (!status) {
    content = (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6">
        <div className="bg-line/50 h-8 w-40 animate-pulse rounded-lg" />
        <div className="bg-line/50 h-64 w-full animate-pulse rounded-xl" />
      </div>
    )
  } else if (!status.installed) {
    content = (
      <Setup
        needsToken={status.needsToken}
        onInstalled={() => setStatus({ ...status, installed: true })}
      />
    )
  } else if (location.pathname === '/setup') {
    content = <Navigate to="/admin" replace />
  } else {
    content = (
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/k/:slug" element={<CategoryPage />} />
          <Route path="/cari" element={<Search />} />
        </Route>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="produk" element={<Products />} />
          <Route path="produk/baru" element={<ProductForm />} />
          <Route path="produk/:id" element={<ProductForm />} />
          <Route path="kategori" element={<Categories />} />
          <Route path="pengaturan" element={<Settings />} />
        </Route>
        <Route
          path="*"
          element={<Placeholder title="Halaman tidak ditemukan." />}
        />
      </Routes>
    )
  }

  return (
    <LanguageProvider language={language} onChange={changeLanguage}>
      {content}
    </LanguageProvider>
  )
}
