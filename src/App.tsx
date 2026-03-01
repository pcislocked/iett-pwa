import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomTabBar from '@/components/BottomTabBar'
import Home from '@/pages/Home'
import StopPage from '@/pages/StopPage'
import RoutePage from '@/pages/RoutePage'
import MapPage from '@/pages/MapPage'
import SettingsPage from '@/pages/SettingsPage'
import FavoritesPage from '@/pages/FavoritesPage'
import NearbyPage from '@/pages/NearbyPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-dvh">
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stops/:dcode" element={<StopPage />} />
            <Route path="/routes/:hatKodu" element={<RoutePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/nearby" element={<NearbyPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <BottomTabBar />
      </div>
    </BrowserRouter>
  )
}
