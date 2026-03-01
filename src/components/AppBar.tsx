import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useBottomBarContext } from '@/hooks/useBottomBar'
import { MAIN_PATHS } from '@/routes'

/* â”€â”€ Ellipsis secondary nav items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const MENU_ITEMS = [
  { label: 'favoriler', to: '/favorites' },
  { label: 'harita',    to: '/map' },
  { label: 'ayarlar',  to: '/settings' },
]

const MAIN_TAB_PATHS = MAIN_PATHS as readonly string[]

/* â”€â”€ Metro circle icon button â€” used only for custom (detail page) tabs â”€â”€â”€ */
interface MetroIconBtnProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onPress: () => void
}
function MetroIconBtn({ icon, label, active, onPress }: MetroIconBtnProps) {
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
        <span style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.35)' }}>{icon}</span>
      </div>
      <span className="text-[9px] lowercase leading-none"
            style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
        {label}
      </span>
    </motion.button>
  )
}

/**
 * Windows Phone 8 Application Bar.
 *
 * Main pages: 3 flat-square tab indicators (active = solid white tile,
 * inactive = dim tile) + Â·Â·Â· ellipsis on the right.
 * No icons/labels on the bar â€” Pivot header at top carries those.
 *
 * Detail pages (customTabs set): icon+label circle buttons as before.
 */
export default function AppBar() {
  const { customTabs } = useBottomBarContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentIdx = MAIN_TAB_PATHS.indexOf(location.pathname)
  const isMain = currentIdx !== -1

  return (
    <div className="flex-none relative" style={{ background: '#000' }}>

      {/* â”€â”€ Ellipsis secondary menu (slides up) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="ellipsis-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
            style={{ borderTop: '1px solid #1a1a1a' }}
          >
            {MENU_ITEMS.map(item => (
              <motion.button
                key={item.to}
                onClick={() => { navigate(item.to); setMenuOpen(false) }}
                whileTap={{ x: 10 }}
                transition={{ duration: 0.08 }}
                className="w-full text-left px-6 py-3 text-white text-xl lowercase"
                style={{ borderBottom: '1px solid #111' }}
              >
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="flex items-center safe-area-pb"
        style={{ borderTop: '1px solid #1a1a1a', padding: '10px 20px' }}
      >
        {customTabs ? (
          /* Detail pages â€” icon+label circle buttons */
          <div className="flex items-center justify-center gap-6 flex-1">
            {customTabs.map((tab, i) => (
              <MetroIconBtn
                key={i}
                icon={tab.icon}
                label={tab.label}
                active={tab.active}
                onPress={tab.onPress}
              />
            ))}
          </div>
        ) : (
          /* Main tabs â€” flat square indicators */
          <>
            <div className="flex items-center gap-3 flex-1">
              {MAIN_TAB_PATHS.map((path, i) => {
                const active = isMain && i === currentIdx
                return (
                  <motion.button
                    key={path}
                    onClick={() => { setMenuOpen(false); navigate(path) }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.08 }}
                    aria-label={path}
                    style={{
                      width: 44,
                      height: 44,
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.12)',
                      border: 'none',
                      flexShrink: 0,
                    }}
                  />
                )
              })}
            </div>

            {/* Ellipsis Â·Â·Â· */}
            <motion.button
              onClick={() => setMenuOpen(p => !p)}
              whileTap={{ scale: 0.85 }}
              transition={{ duration: 0.1 }}
              style={{ color: menuOpen ? '#00AFF0' : 'rgba(255,255,255,0.5)', lineHeight: 1 }}
              className="text-2xl tracking-widest w-10 text-center"
              aria-label="MenÃ¼"
            >
              Â·Â·Â·
            </motion.button>
          </>
        )}
      </div>
    </div>
  )
}
