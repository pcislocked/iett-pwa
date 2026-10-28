import { useState } from 'react'
import type { BusPosition, NearbyStop } from '@/api/client'
import { useTranslation } from 'react-i18next'
import { formatPlate } from '@/utils/plateUtils'

export interface MapEntityPickerProps {
  buses: BusPosition[]
  stops: NearbyStop[]
  onSelectBus: (kapino: string) => void
  onSelectStop: (stop: NearbyStop) => void
  onClose: () => void
}

type EntityFilter = 'all' | 'stops' | 'buses'

export default function MapEntityPicker({ buses, stops, onSelectBus, onSelectStop, onClose }: MapEntityPickerProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<EntityFilter>('all')

  const totalCount = buses.length + stops.length

  const title =
    stops.length > 0 && buses.length > 0
      ? t('map.busesAndStopsAtPoint', 'Bu noktada araç ve duraklar var')
      : buses.length > 0
        ? t('map.busesAtPoint', { count: buses.length, defaultValue: 'Bu noktada {{count}} araç var' })
        : t('map.stopsAtPoint', { count: stops.length, defaultValue: 'Bu noktada {{count}} durak var' })

  const showStops = filter === 'all' || filter === 'stops'
  const showBuses = filter === 'all' || filter === 'buses'

  return (
    <div className="absolute bottom-24 left-4 right-4 z-[1100]">
      <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden max-h-[380px] flex flex-col">
        
        {/* Header with Title, Close, and Filter Pills (Variation 2) */}
        <div className="p-3.5 border-b border-surface-border bg-surface/80">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                {t('map.vehicles', 'Araçlar & Duraklar')}
              </p>
              <h3 className="text-xs font-extrabold text-text-primary truncate">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary p-1 -mr-1 transition-colors"
              aria-label={t('common.close', 'Kapat')}
            >
              ✕
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filter === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-surface-muted text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('common.all', 'Tümü')} ({totalCount})
            </button>

            {stops.length > 0 && (
              <button
                onClick={() => setFilter('stops')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  filter === 'stops'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-surface-muted text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>🚏</span>
                <span>{t('nav.stops', 'Duraklar')}</span> ({stops.length})
              </button>
            )}

            {buses.length > 0 && (
              <button
                onClick={() => setFilter('buses')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  filter === 'buses'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-surface-muted text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>🚌</span>
                <span>{t('map.vehicles', 'Araçlar')}</span> ({buses.length})
              </button>
            )}
          </div>
        </div>

        {/* Filtered Scrollable List */}
        <div className="overflow-y-auto overscroll-contain p-2 flex flex-col gap-1.5 text-xs max-h-[280px]">
          {/* Stops Section */}
          {showStops &&
            stops.map((s) => (
              <button
                key={`picker-stop-${s.stop_code}`}
                onClick={() => onSelectStop(s)}
                className="w-full flex items-center justify-between p-2.5 bg-surface hover:bg-surface-muted rounded-xl border border-surface-border text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xs shrink-0 font-bold">
                    🚏
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-text-primary truncate">
                      {s.stop_name}{' '}
                      <span className="text-[10px] text-text-muted font-mono font-normal">
                        #{s.stop_code}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-muted truncate">
                      {s.district ? `${s.district} · ` : ''}
                      {s.direction ? `→ ${s.direction}` : t('map.noDirectionInfo', 'Yön Bilgisi Yok')}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-brand-400 font-semibold shrink-0 ml-2">
                  {t('map.openStop', 'Seç')} &rarr;
                </span>
              </button>
            ))}

          {/* Buses Section */}
          {showBuses &&
            buses.map((b) => (
              <button
                key={`picker-bus-${b.kapino}`}
                onClick={() => onSelectBus(b.kapino)}
                className="w-full flex items-center justify-between p-2.5 bg-surface hover:bg-surface-muted rounded-xl border border-surface-border text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {b.route_code ? (
                    <span className="px-2 py-0.5 rounded bg-brand-600/20 border border-brand-500/40 text-brand-400 font-black text-xs font-mono shrink-0">
                      {b.route_code}
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center text-xs shrink-0 font-bold">
                      🚌
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-text-primary font-mono truncate">
                      {b.kapino}{' '}
                      {b.plate && (
                        <span className="text-[10px] text-text-muted font-normal font-mono">
                          ({formatPlate(b.plate)})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">
                      {b.route_name ? `${b.route_name} · ` : ''}
                      {b.direction ? `→ ${b.direction} · ` : ''}
                      {b.speed !== null ? `${b.speed} km/h` : ''}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-brand-400 font-semibold shrink-0 ml-2">
                  {t('map.openRoute', 'Seç')} &rarr;
                </span>
              </button>
            ))}
        </div>

      </div>
    </div>
  )
}
