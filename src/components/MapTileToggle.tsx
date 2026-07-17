import { useTranslation } from 'react-i18next'

export const TILES = [
  { key: 'dark', icon: '🌙', label: 'map.tileDark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  { key: 'light', icon: '☀️', label: 'map.tileLight', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' },
  { key: 'sat', icon: '🛰️', label: 'map.tileSat', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
] as const

interface Props {
  tileIdx: number
  onCycle: () => void
}

export default function MapTileToggle({ tileIdx, onCycle }: Props) {
  const { t } = useTranslation()
  const currentTile = TILES[tileIdx]

  return (
    <button
      onClick={onCycle}
      title={t(currentTile.label as any, { defaultValue: 'Harita görünümünü değiştir' })}
      className="w-10 h-10 bg-surface-card/90 backdrop-blur 
                 rounded-xl shadow-lg border border-surface-muted flex items-center justify-center
                 text-xl hover:scale-105 active:scale-95 transition-all"
    >
      {currentTile.icon}
    </button>
  )
}
