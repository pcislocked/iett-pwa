import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
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

/** Global horizontal-swipe listener: navigates between main tabs. */
function GlobalSwipe() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let startX = 0
    let startY = 0

    function onTouchStart(e: TouchEvent) {
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
      if (dx < 0 && idx < MAIN_PATHS.length - 1) navigate(MAIN_PATHS[idx + 1])
      if (dx > 0 && idx > 0) navigate(MAIN_PATHS[idx - 1])
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
        <div className="flex flex-col h-dvh bg-black">
          <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            <Routes>
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
          <InstallBannerWrapper />
          <BottomTabBar />
        </div>
      </BottomBarContext.Provider>
    </BrowserRouter>
  )
}

