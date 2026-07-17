import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const links = [
  { to: '/',        labelKey: 'nav.home', fallback: 'Ana Sayfa' },
  { to: '/map',     labelKey: 'nav.map', fallback: 'Harita' },
  { to: '/settings', labelKey: 'nav.settings', fallback: 'Ayarlar' },
]

export default function NavBar() {
  const { t } = useTranslation()
  return (
    <header className="bg-surface-card border-b border-surface-muted sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-brand-500 font-bold text-lg tracking-tight">
          {t('app.title', 'İETT Canlı')}
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map(({ to, labelKey, fallback }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'text-brand-500 font-semibold'
                  : 'text-text-secondary hover:text-text-primary transition-colors'
              }
            >
              {t(labelKey, fallback)}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
