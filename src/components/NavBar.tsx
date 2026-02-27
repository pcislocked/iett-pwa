import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/',        label: 'Ana Sayfa' },
  { to: '/map',     label: 'Harita' },
  { to: '/settings', label: 'Ayarlar' },
]

export default function NavBar() {
  return (
    <header className="bg-surface-card border-b border-surface-muted sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-brand-500 font-bold text-lg tracking-tight">
          İETT Canlı
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'text-brand-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 transition-colors'
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
