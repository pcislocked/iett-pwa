import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useBottomBarContext } from '@/hooks/useBottomBar'
import { MAIN_PATHS } from '@/routes'

/* ── Ellipsis secondary nav items ────────────────────────────────────────── */
const MENU_ITEMS = [
  { label: 'favoriler', to: '/favorites' },
  { label: 'harita',    to: '/map' },
  { label: 'ayarlar',  to: '/settings' },
]

/* ── Metro circle icon button ────────────────────────────────────────────── */
interface MetroIconBtnProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onPress: () => void
  showLabel?: boolean
}

function MetroIconBtn({ icon, label, active, onPress, showLabel }: MetroIconBtnProps) {
  return (
    <motion.button
      onClick={onPress}
      whileTap={{ scale: 0.88, rotateX: 3 }}
      style={{ perspective: 400 }}
      transition={{ duration: 0.1 }}
      className="flex flex-col items-center gap-1"
      aria-label={label}
    >
      <div
        className="w-12 h-12 flex items-center justify-center"
        style={{
          border: `2px solid ${active ? '#ffffff' : 'rgba(255,255,255,0.3)'}`,
          background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        }}
      >
        <span style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.35)' }}>
          {icon}
        </span>
      </div>
      {showLabel && (
        <span
          className="text-[9px] lowercase leading-none"
          style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.4)' }}
        >
          {label}
        </span>
      )}
    </motion.button>
  )
}

/* ── Default main-tab icon definitions ──────────────────────────────────── */
const DEFAULT_TABS = [
  {
    to: '/search',
    label: 'ara',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
    ),
  },
  {
    to: '/',
    label: 'ana',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    to: '/nearby',
    label: 'yakın',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
]

/**
 * Windows Phone 8 Application Bar.
 *
 * Main pages: 3 main-tab circle-icon buttons + ··· ellipsis on right.
 * Ellipsis expands upward to reveal secondary nav (Favoriler, Harita, Ayarlar).
 *
 * Detail pages (customTabs set): renders custom tab icons in the same circle
 * style — preserves the existing useBottomBarContext API.
 */
export default function AppBar() {
  const { customTabs } = useBottomBarContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const isMain = (MAIN_PATHS as readonly string[]).includes(location.pathname)

  return (
    <div className="flex-none relative" style={{ background: 'rgba(0,0,0,0.95)' }}>

      {/* ── Ellipsis secondary menu ─────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="ellipsis-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-t border-[#111]"
          >
            {MENU_ITEMS.map(item => (
              <motion.button
                key={item.to}
                onClick={() => { navigate(item.to); setMenuOpen(false) }}
                whileTap={{ x: 8 }}
                transition={{ duration: 0.08 }}
                className="w-full text-left px-6 py-3 lowercase text-white text-lg"
                style={{ borderBottom: '1px solid #111' }}
              >
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center px-6 py-2 safe-area-pb"
           style={{ borderTop: '1px solid #111' }}>

        {/* Custom tabs (detail pages) */}
        {customTabs ? (
          <div className="flex items-center justify-center gap-6 flex-1">
            {customTabs.map((tab, i) => (
              <MetroIconBtn
                key={i}
                icon={tab.icon}
                label={tab.label}
                active={tab.active}
                onPress={tab.onPress}
                showLabel
              />
            ))}
          </div>
        ) : (
          /* Default main-tab buttons */
          <>
            <div className="flex items-center gap-6 flex-1">
              {DEFAULT_TABS.map(tab => (
                <MetroIconBtn
                  key={tab.to}
                  icon={tab.icon}
                  label={tab.label}
                  active={isMain && location.pathname === tab.to}
                  onPress={() => { setMenuOpen(false); navigate(tab.to) }}
                />
              ))}
            </div>

            {/* Ellipsis */}
            <motion.button
              onClick={() => setMenuOpen(p => !p)}
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.1 }}
              className="flex flex-col items-center justify-center w-10 h-10"
              style={{ color: menuOpen ? '#00AFF0' : 'rgba(255,255,255,0.6)' }}
              aria-label="Menü"
            >
              <span className="text-2xl leading-none tracking-widest">···</span>
            </motion.button>
          </>
        )}
      </div>
    </div>
  )
}
