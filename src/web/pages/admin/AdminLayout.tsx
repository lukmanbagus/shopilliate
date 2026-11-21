import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useLanguage } from '../../lib/language'
import AdminFooter from '../../components/AdminFooter'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const links = [
    { to: '/admin', label: t('Dashboard'), end: true },
    { to: '/admin/produk', label: t('Produk'), end: false },
    { to: '/admin/kategori', label: t('Kategori'), end: false },
    { to: '/admin/pengaturan', label: t('Pengaturan'), end: false },
  ]
  const [username, setUsername] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    api
      .me()
      .then((data) => {
        if (active) setUsername(data.username)
      })
      .catch((error) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) {
          navigate('/admin/login', {
            replace: true,
            state: { from: location.pathname },
          })
        }
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [navigate, location.pathname])

  async function handleLogout() {
    try {
      await api.logout()
    } finally {
      navigate('/admin/login', { replace: true })
    }
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <div className="bg-line/40 h-6 w-40 animate-pulse rounded" />
        <div className="bg-line/40 mt-4 h-40 w-full animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-line border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <Link to="/admin" className="text-lg font-extrabold tracking-tight">
            Shopi<span className="text-primary-text">lliate</span>
            <span className="text-muted ml-2 text-xs font-medium">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted hidden text-sm sm:inline">
              {username}
            </span>
            <button
              onClick={handleLogout}
              className="border-line min-h-9 rounded-lg border px-3 text-sm font-semibold hover:bg-page"
            >
              {t('Keluar')}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 pb-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex min-h-10 shrink-0 items-center rounded-lg px-3 text-sm font-semibold ${
                  isActive
                    ? 'bg-primary-soft text-primary-ink'
                    : 'text-muted hover:bg-page'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        <Outlet />
      </main>
      <AdminFooter />
    </div>
  )
}
