import type { BusPosition } from '@/api/client'
import { useTranslation } from 'react-i18next'

interface Props {
  buses: BusPosition[]
  onSelect: (kapino: string) => void
  onClose: () => void
}

export default function MapBusPicker({ buses, onSelect, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <div className="absolute bottom-24 left-4 right-4 z-[1100]">
      <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-muted flex items-center justify-between">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {t('map.busesAtPoint', { count: buses.length, defaultValue: 'Bu noktada {{count}} araç var' })}
          </span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xl leading-none -mt-1"
            aria-label={t('common.close', 'Kapat')}
          >
            &times;
          </button>
        </div>

        {/* Liste — max 240px scroll */}
        <div className="max-h-[240px] overflow-y-auto overscroll-contain">
          {buses.map(b => (
            <button
              key={b.kapino}
              onClick={() => {
                onSelect(b.kapino)
                onClose()
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left
                         border-b border-surface-muted last:border-0
                         hover:bg-surface-muted/50 active:bg-surface-muted transition-colors"
            >
              {/* Hat kodu badge */}
              {b.route_code && (
                <span className="bg-brand-600 text-white text-[11px] font-mono
                                 font-bold px-2 py-0.5 rounded shrink-0">
                  {b.route_code}
                </span>
              )}

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-text-primary">{b.kapino}</span>
                  {b.plate && (
                    <span className="text-[11px] text-text-muted tracking-wide font-mono">{b.plate}</span>
                  )}
                </div>
                {b.direction && (
                  <span className="text-[10px] text-text-secondary truncate mt-0.5 uppercase tracking-wide">
                    &rarr; {b.direction}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {b.speed !== null && (
                  <span className="text-[10px] text-brand-300 font-mono">
                    {b.speed} km/h
                  </span>
                )}
                <svg className="w-4 h-4 text-text-muted" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
