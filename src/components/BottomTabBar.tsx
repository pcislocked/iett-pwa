import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useBottomBarContext } from '@/hooks/useBottomBar'
import MenuSheet from '@/components/MenuSheet'

// The 3 swipeable main pages in order
const MAIN_PATHS = ['/search', '/', '/nearby']

const DEFAULT_TABS_CFG = [
  {
    to: '/search',
    label: 'Ara',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={active ? 2.5 : 2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
    ),
  },
  {
    to: '/',
    label: 'Ana',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor"
           strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    to: '/nearby',
    label: 'Yakın',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor"
           strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
]

export default function BottomTabBar() {
  const { customTabs } = useBottomBarContext()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // ── Context-aware mode: detail page overrides the bar ─────────────────────
  if (customTabs) {
    return (
      <nav className="flex-none bg-surface-card border-t border-surface-border safe-area-pb">
        <div className="max-w-2xl mx-auto flex">
          {customTabs.map((tab, i) => (
            <button
              key={i}
              onClick={tab.onPress}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative
                          transition-colors ${tab.active ? 'text-white' : 'text-slate-600'}`}
            >
              {tab.active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-500" />
              )}
              {tab.icon}
              <span className="text-[9px] font-medium leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    )
  }

  // ── Default 4-tab bar: Ara / Ana / Yakın / ≡ ─────────────────────────────
  const isMain = MAIN_PATHS.includes(location.pathname)

  return (
    <>
      <nav className="flex-none bg-surface-card border-t border-surface-border safe-area-pb">
        <div className="max-w-2xl mx-auto flex">
          {DEFAULT_TABS_CFG.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative
                 transition-colors ${isActive && isMain ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && isMain && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-500" />
                  )}
                  {icon(isActive && isMain)}
                  <span className="text-[9px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* ≡ Menu button — opens sheet, not a NavLink */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5
                       text-slate-600 hover:text-slate-400 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
            <span className="text-[9px] font-medium leading-none">Menü</span>
          </button>
        </div>
      </nav>

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} />}
    </>
  )
}

