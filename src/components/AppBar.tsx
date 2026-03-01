import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MAIN_PATHS } from '@/routes'

/* ── SVG icons ─────────────────────────────────────────────────────────────── */
function IconBack() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}
function IconHome() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

/* ── Labelled icon button ────────────────────────────────────────────────────── */
interface AppBtnProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  dim?: boolean
  onPress: () => void
}
function AppBtn({ icon, label, active, dim, onPress }: AppBtnProps) {
  const borderColor = active
    ? '#ffffff'
    : dim
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.3)'
  const iconColor = active ? '#ffffff' : dim ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)'
  const labelColor = active ? '#ffffff' : dim ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.4)'

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        onClick={onPress}
        whileTap={dim ? {} : { scale: 0.88 }}
        transition={{ duration: 0.1 }}
        disabled={dim}
        aria-label={label}
        className="flex items-center justify-center"
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: `2px solid ${borderColor}`,
          background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </motion.button>
      <span
        className="text-[9px] font-medium leading-none tracking-wide uppercase select-none"
        style={{ color: labelColor }}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Windows Phone 8 Application Bar.
 *
 * 4 labelled circle icon buttons:
 *   [← geri]  [🏠 ana]  [🔍 ara]  [⚙ ayarlar]
 *
 * Back is dimmed on the home screen.
 * Home navigates to / (back is dimmed there, effectively "skip back/back/back").
 */
export default function AppBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isHome     = (MAIN_PATHS as readonly string[]).includes(location.pathname)
  const isSearch   = location.pathname === '/search'
  const isSettings = location.pathname === '/settings'

  return (
    <div
      className="flex-none safe-area-pb"
      style={{ background: '#000', borderTop: '1px solid #1a1a1a' }}
    >
      <div className="flex items-end justify-center gap-8 px-6 py-2.5">
        <AppBtn icon={<IconBack />}     label="Geri"    dim={isHome}      onPress={() => navigate(-1)} />
        <AppBtn icon={<IconHome />}     label="Ana"     active={isHome}   onPress={() => navigate('/')} />
        <AppBtn icon={<IconSearch />}   label="Ara"     active={isSearch} onPress={() => navigate('/search')} />
        <AppBtn icon={<IconSettings />} label="Ayarlar" active={isSettings} onPress={() => navigate('/settings')} />
      </div>
    </div>
  )
}
