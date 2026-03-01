import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

/**
 * Module-level mutable written by GlobalSwipe immediately before each
 * navigate() call.  AnimatedMain reads it once at mount time (useState
 * initialiser) to decide which keyframe to play.
 */
let _pendingNavDir: 'left' | 'right' = 'left'

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
      // Require horizontal intent (|dx|>55, |dx|>|dy|*1.5) and main tab
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      const idx = (MAIN_PATHS as readonly string[]).indexOf(location.pathname)
      if (idx === -1) return
      if (dx < 0 && idx < MAIN_PATHS.length - 1) {
        _pendingNavDir = 'left'
        navigate(MAIN_PATHS[idx + 1])
      }
      if (dx > 0 && idx > 0) {
        _pendingNavDir = 'right'
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

/**
 * Wraps <Routes> with a keyed div so each navigation mounts a fresh element
 * and the enter-slide CSS animation plays.  Direction is captured from the
 * module-level ref at mount time.
 */
function AnimatedMain() {
  const location = useLocation()
  // Capture direction once per mount (i.e., once per navigation event).
  const [slideDir] = useState<'left' | 'right'>(() => _pendingNavDir)
  const animClass =
    slideDir === 'right' ? 'animate-page-in-left' : 'animate-page-in-right'

  return (
    <main
      key={location.key}
      className={`flex-1 min-h-0 flex flex-col overflow-y-auto ${animClass}`}
    >
      <Routes location={location}>
        <Route path="/search" element={<SearchPage />} />
        <Route path="/" element={<Home />} />
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/stops/:dcode" element={<StopPage />} />
        <Route path="/routes/:hatKodu" element={<RoutePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </main>
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

