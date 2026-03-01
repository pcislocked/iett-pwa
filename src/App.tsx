import { BrowserRouter, Routes, Route, useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import BottomTabBar from '@/components/BottomTabBar'
import InstallBanner, { useInstallBanner } from '@/components/InstallBanner'
import Home from '@/pages/Home'
import SearchPage from '@/pages/SearchPage'
import StopPage from '@/pages/StopPage'
import RoutePage from '@/pages/RoutePage'
import MapPage from '@/pages/MapPage'
import SettingsPage from '@/pages/SettingsPage'
import FavoritesPage from '@/pages/FavoritesPage'
import NearbyPage from '@/pages/NearbyPage'
import { BottomBarContext, useBottomBarState } from '@/hooks/useBottomBar'
import { MAIN_PATHS } from '@/routes'

// Written by GlobalSwipe before each swipe-initiated navigate.
let _pendingNavDir: 'left' | 'right' = 'left'
// True only when GlobalSwipe triggered the navigate; reset after AnimatedMain reads it.
let _swipeNav = false

/** Global horizontal-swipe listener: navigates between main tabs. */
function GlobalSwipe() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let startX = 0
    let startY = 0

    function onTouchStart(e: TouchEvent) {
      const target = e.target as Element
      if (target.closest('input, textarea, select, [contenteditable]')) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      const idx = (MAIN_PATHS as readonly string[]).indexOf(location.pathname)
      if (idx === -1) return
      if (dx < 0 && idx < MAIN_PATHS.length - 1) {
        _pendingNavDir = 'left'; _swipeNav = true
        navigate(MAIN_PATHS[idx + 1])
      }
      if (dx > 0 && idx > 0) {
        _pendingNavDir = 'right'; _swipeNav = true
        navigate(MAIN_PATHS[idx - 1])
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [location.pathname, navigate])

  return null
}

/** Route definitions shared between exit and enter renderers. */
function MainRoutes({ loc }: { loc: ReturnType<typeof useLocation> }) {
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
    </Routes>
  )
}

/**
 * Simultaneous in/out CSS transition slide.
 * - Swipe between main tabs  → direction from GlobalSwipe (_swipeNav flag)
 * - Browser back (POP)       → enters from left (right direction)
 * - Tab-bar tap / Link push  → positional for main tabs, else enters from right
 */
function AnimatedMain() {
  const location = useLocation()
  const navType = useNavigationType()
  const prevLocRef = useRef(location)
  const [exitLoc, setExitLoc] = useState<ReturnType<typeof useLocation> | null>(null)
  const [navDir, setNavDir] = useState<'left' | 'right'>('left')
  const [active, setActive] = useState(false)

  useLayoutEffect(() => {
    if (location.key === prevLocRef.current.key) return
    const oldLoc = prevLocRef.current
    prevLocRef.current = location

    let d: 'left' | 'right'
    if (_swipeNav) {
      d = _pendingNavDir
      _swipeNav = false
    } else if (navType === 'POP') {
      d = 'right'
    } else {
      const newIdx = (MAIN_PATHS as readonly string[]).indexOf(location.pathname)
      const oldIdx = (MAIN_PATHS as readonly string[]).indexOf(oldLoc.pathname)
      d = (newIdx !== -1 && oldIdx !== -1) ? (newIdx > oldIdx ? 'left' : 'right') : 'left'
    }

    setExitLoc(oldLoc)
    setNavDir(d)
    setActive(false)
    // Two rAFs: first paints the off-screen positions, second starts CSS transitions
    requestAnimationFrame(() => { requestAnimationFrame(() => { setActive(true) }) })
    const t = window.setTimeout(() => { setExitLoc(null); setActive(false) }, 240)
    return () => window.clearTimeout(t)
  }, [location.key, navType]) // eslint-disable-line react-hooks/exhaustive-deps

  const enterInit = navDir === 'left' ? 'translate-x-full' : '-translate-x-full'
  const exitFinal = navDir === 'left' ? '-translate-x-full' : 'translate-x-full'

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
      {/* Exit page slides out simultaneously with the entering page */}
      {exitLoc && (
        <div className={`absolute inset-0 overflow-y-auto flex flex-col transition-transform duration-[220ms] ease-out ${
          active ? exitFinal : 'translate-x-0'
        }`}>
          <MainRoutes loc={exitLoc} />
        </div>
      )}
      {/* Enter page: off-screen only while a transition is staged (exitLoc set, active false) */}
      <div className={`absolute inset-0 overflow-y-auto flex flex-col transition-transform duration-[220ms] ease-out ${
        (!exitLoc || active) ? 'translate-x-0' : enterInit
      }`}>
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
        <GlobalSwipe />
        <div className="flex flex-col h-dvh bg-black overflow-hidden">
          <AnimatedMain />
          <InstallBannerWrapper />
          <BottomTabBar />
        </div>
      </BottomBarContext.Provider>
    </BrowserRouter>
  )
}

