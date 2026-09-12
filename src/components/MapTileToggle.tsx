import { useTranslation } from 'react-i18next'

interface Props {
  satellite: boolean
  onToggle: () => void
}

export default function MapTileToggle({ satellite, onToggle }: Props) {
  const { t } = useTranslation()

  return (
    <button
      onClick={onToggle}
      title={t(satellite ? 'map.tileMap' : 'map.tileSat', { defaultValue: satellite ? 'Harita Görünümü' : 'Uydu Görünümü' })}
      className="w-10 h-10 bg-surface-card/90 backdrop-blur
                 rounded-xl shadow-lg border border-surface-muted flex items-center justify-center
                 text-xl hover:scale-105 active:scale-95 transition-all"
    >
      {satellite ? '???' : '???'}
    </button>
  )
}
