import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from '@/components/NavBar'
import Home from '@/pages/Home'
import StopPage from '@/pages/StopPage'
import RoutePage from '@/pages/RoutePage'
import MapPage from '@/pages/MapPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-1 overflow-y-auto pb-safe">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stops/:dcode" element={<StopPage />} />
            <Route path="/routes/:hatKodu" element={<RoutePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
