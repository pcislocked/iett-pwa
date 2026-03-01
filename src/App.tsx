import { BrowserRouter, Routes, Route, useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import AppBar from '@/components/AppBar'
import InstallBanner, { useInstallBanner } from '@/components/InstallBanner'
import Home from '@/pages/Home'
import SearchPage from '@/pages/SearchPage'
import StopPage from '@/pages/StopPage'
import RoutePage from '@/pages/RoutePage'
import MapPage from '@/pages/MapPage'
import SettingsPage from '@/pages/SettingsPage'
import FavoritesPage from '@/pages/FavoritesPage'
import NearbyPage from '@/pages/NearbyPage'
import PinnedManagePage from '@/pages/PinnedManagePage'
import { BottomBarContext, useBottomBarState } from '@/hooks/useBottomBar'
import { MAIN_PATHS } from '@/routes'

// Set by swipe commit before navigate() so useLayoutEffect skips CSS transition
let _swipeNav = false

/** Build a minimal Location object for static strip slots */
function makeLoc(pathname: string) {
  return { pathname, search: '', hash: '', state: null, key: `strip-${pathname}` }
}

/** Route definitions shared between exit and enter renderers. */
function MainRoutes({ loc }: { loc: ReturnType<typeof useLocation> | ReturnType<typeof makeLoc> }) {
  return (
    <Routes location={loc}>
      <Route path="/search"          element={<SearchPage />} />
      <Route path="/"                element={<Home />} />
      <Route path="/nearby"          element={<NearbyPage />} />
      <Route path="/stops/:dcode"    element={<StopPage />} />
      <Route path="/routes/:hatKodu" element={<RoutePage />} />
      <Route path="/map"             element={<MapPage />} />
      <Route path="/favorites"       element={<FavoritesPage />} />
      <Route path="/settings"        element={<SettingsPage />} />
      <Route path="/pinned"          element={<PinnedManagePage />} />
    </Routes>
  )
}

/**
 * Finger-following swipe between main tabs (strip model) +
 * CSS-transition slide for programmatic navigations (back, AppBar, links).
 */
function AnimatedMain() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const navType   = useNavigationType()
  const prevLocRef = useRef(location)
  const stripRef   = useRef<HTMLDivElement>(null)

  // Programmatic-transition state (non-swipe navigations)
  const [exitLoc, setExitLoc]  = useState<ReturnType<typeof useLocation> | null>(null)
  const [navDir,  setNavDir]   = useState<'left' | 'right'>('left')
  const [active,  setActive]   = useState(false)

  const currentIdx = (MAIN_PATHS as readonly string[]).indexOf(location.pathname)
  const onMainPath = currentIdx !== -1
  // Number of pages Ã— 100% = strip width expressed as percentage of itself
  const N = MAIN_PATHS.length  // 3

  /* â”€â”€ Programmatic transition (back button or AppBar taps) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useLayoutEffect(() => {
    if (location.key === prevLocRef.current.key) return
    if (_swipeNav) {
      // Swipe already handled the visual; just sync state
      _swipeNav = false
      prevLocRef.current = location
      return
    }
    const oldLoc = prevLocRef.current
    prevLocRef.current = location

    // On mainâ†’main programmatic: strip will reposition itself via inline style; no extra transition needed
    const newIdx = (MAIN_PATHS as readonly string[]).indexOf(location.pathname)
    const oldIdx = (MAIN_PATHS as readonly string[]).indexOf(oldLoc.pathname)
    if (newIdx !== -1 && oldIdx !== -1) {
      // Both main: strip handles it, skip exit/enter overlay
      return
    }

    let d: 'left' | 'right'
    if (navType === 'POP') {
      d = 'right'
    } else {
      d = (newIdx !== -1 && oldIdx !== -1) ? (newIdx > oldIdx ? 'left' : 'right') : 'left'
    }

    setExitLoc(oldLoc)
    setNavDir(d)
    setActive(false)
    requestAnimationFrame(() => { requestAnimationFrame(() => { setActive(true) }) })
    const t = window.setTimeout(() => { setExitLoc(null); setActive(false) }, 240)
    return () => window.clearTimeout(t)
  }, [location.key, navType]) // eslint-disable-line react-hooks/exhaustive-deps

  /* â”€â”€ Live-swipe touch handler (main-path strip only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (!onMainPath) return

    // touchRef holds live drag state; written/read without React state to avoid re-renders
    // startX is null when the touch started on an interactive element and should be ignored
    const touchRef = { startX: null as number | null, startY: 0, locked: false, canceled: false, committed: false }

    function stripX(dx = 0, withTransition = false) {
      const el = stripRef.current
      if (!el) return
      el.style.transition = withTransition
        ? 'transform 280ms cubic-bezier(0.25,0.46,0.45,0.94)'
        : 'none'
      // Each page occupies (100/N)% of the strip; strip is N*100vw wide
      // Normal position: -currentIdx * (100/N)% â€” same as -currentIdx * 100vw
      el.style.transform = `translateX(calc(${-currentIdx} * ${100 / N}% + ${dx}px))`
    }

    function onTouchStart(e: TouchEvent) {
      const target = e.target as Element
      if (target.closest('input, textarea, select, [contenteditable]')) {
        touchRef.startX = null   // mark as ignored so touchend skips it
        return
      }
      Object.assign(touchRef, {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        locked: false, canceled: false, committed: false,
      })
    }

    function onTouchMove(e: TouchEvent) {
      if (touchRef.canceled || touchRef.committed || touchRef.startX === null) return
      const dx = e.touches[0].clientX - touchRef.startX
      const dy = e.touches[0].clientY - touchRef.startY

      if (!touchRef.locked) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return         // dead zone
        if (Math.abs(dy) > Math.abs(dx) * 1.2) { touchRef.canceled = true; return }
        // Check edge bounds
        if (dx > 0 && currentIdx === 0) { touchRef.canceled = true; return }
        if (dx < 0 && currentIdx === N - 1) { touchRef.canceled = true; return }
        touchRef.locked = true
      }

      e.preventDefault()   // prevent scroll while swiping horizontally
      stripX(dx)
    }

    function onTouchEnd(e: TouchEvent) {
      if (!touchRef.locked || touchRef.startX === null) return
      const dx = e.changedTouches[0].clientX - touchRef.startX
      const threshold = window.innerWidth * 0.28

      if (Math.abs(dx) > threshold) {
        touchRef.committed = true
        const dir: 'left' | 'right' = dx < 0 ? 'left' : 'right'
        const targetIdx = dir === 'left' ? currentIdx + 1 : currentIdx - 1
        const commitDx  = dir === 'left' ? -window.innerWidth : window.innerWidth
        stripX(commitDx, true)
        _swipeNav      = true
        setTimeout(() => navigate(MAIN_PATHS[targetIdx]), 280)
      } else {
        // Snap back
        stripX(0, true)
      }
    }

    document.addEventListener('touchstart',  onTouchStart, { passive: true })
    document.addEventListener('touchmove',   onTouchMove,  { passive: false })
    document.addEventListener('touchend',    onTouchEnd,   { passive: true })
    return () => {
      document.removeEventListener('touchstart',  onTouchStart)
      document.removeEventListener('touchmove',   onTouchMove)
      document.removeEventListener('touchend',    onTouchEnd)
    }
  }, [onMainPath, currentIdx, N, navigate])

  /* â”€â”€ Render: strip on main paths, overlay slide elsewhere â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (onMainPath) {
    return (
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          ref={stripRef}
          className="absolute inset-y-0 left-0 flex"
          style={{
            width: `${N * 100}%`,
            transform: `translateX(calc(${-currentIdx} * ${100 / N}%))`,
            willChange: 'transform',
          }}
        >
          {(MAIN_PATHS as readonly string[]).map(path => (
            <div
              key={path}
              className="h-full overflow-y-auto bg-black flex flex-col"
              style={{ width: `${100 / N}%` }}
            >
              <MainRoutes loc={makeLoc(path)} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Off main paths â€” classic exit/enter overlay transition
  const enterInit = navDir === 'left' ? 'translate-x-full' : '-translate-x-full'
  const exitFinal = navDir === 'left' ? '-translate-x-full' : 'translate-x-full'

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
      {exitLoc && (
        <div
          className={`absolute inset-0 bg-black overflow-y-auto flex flex-col transition-transform duration-[220ms] ease-out ${
            active ? exitFinal : 'translate-x-0'
          }`}
          style={{ willChange: 'transform' }}
        >
          <MainRoutes loc={exitLoc} />
        </div>
      )}
      <div
        className={`absolute inset-0 bg-black overflow-y-auto flex flex-col transition-transform duration-[220ms] ease-out ${
          (!exitLoc || active) ? 'translate-x-0' : enterInit
        }`}
        style={{ willChange: 'transform' }}
      >
        <MainRoutes loc={location} />
      </div>
    </div>
  )
}

function InstallBannerWrapper() {
  const { show, dismiss, install } = useInstallBanner()
  if (!show) return null
  return <InstallBanner onDismiss={dismiss} onInstall={install} />
}

export default function App() {
  const bottomBarState = useBottomBarState()

  return (
    <BrowserRouter>
      <BottomBarContext.Provider value={bottomBarState}>
        <div className="flex flex-col h-dvh bg-black overflow-hidden">
          <AnimatedMain />
          <InstallBannerWrapper />
          <AppBar />
        </div>
      </BottomBarContext.Provider>
    </BrowserRouter>
  )
}

