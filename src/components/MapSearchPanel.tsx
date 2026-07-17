import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type RouteSearchResult, type StopSearchResult, type BusPosition } from '@/api/client'

// Palette from CanvasFleetLayer to color the chips identically
const PALETTE = ['#f97316','#22c55e','#3b82f6','#a855f7','#ef4444']

interface Props {
  selectedRoutes: string[]
  selectedStops: { dcode: string; name: string }[]
  fleetVisible: boolean
  busCount: number
  fleet: BusPosition[] | null
  onAddRoute: (hatKodu: string) => void
  onRemoveRoute: (hatKodu: string) => void
  onAddStop: (dcode: string, name: string) => void
  onRemoveStop: (dcode: string) => void
  onToggleFleet: () => void
  onBusSearch: (kapino: string) => void
}

export default function MapSearchPanel({
  selectedRoutes,
  selectedStops,
  fleetVisible,
  busCount,
  fleet,
  onAddRoute,
  onRemoveRoute,
  onAddStop,
  onRemoveStop,
  onToggleFleet,
  onBusSearch,
}: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [routeResults, setRouteResults] = useState<RouteSearchResult[]>([])
  const [stopResults, setStopResults] = useState<StopSearchResult[]>([])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-search effect (debounced)
  useEffect(() => {
    if (query.trim().length < 2) {
      setRouteResults([])
      setStopResults([])
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const timer = window.setTimeout(async () => {
      try {
        const [rRes, sRes] = await Promise.all([
          api.routes.search(query, { signal: controller.signal }).catch(() => [] as RouteSearchResult[]),
          api.stops.search(query, { signal: controller.signal }).catch(() => [] as StopSearchResult[]),
        ])
        if (!cancelled) {
          setRouteResults(rRes.slice(0, 5))
          setStopResults(sRes.slice(0, 5))
        }
      } catch (err) {
        if (!cancelled && (err as { name?: string }).name !== 'AbortError') {
          setRouteResults([])
          setStopResults([])
        }
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // Local bus search within loaded fleet (client-side filter)
  const busResults = useMemo(() => {
    if (query.trim().length < 2) return []
    const q = query.toUpperCase().trim()
    
    let results: any[] = []
    
    // 1. Filo yüklüyse client-side filtrele
    if (fleet) {
      results = fleet.filter(b => 
        b.kapino.toUpperCase().includes(q) || 
        (b.plate && b.plate.toUpperCase().includes(q))
      ).slice(0, 5)
    }

    // 2. Filo yüklü değilse veya sonuç bulamadıysa, yazılan şey kapı no veya plakaya benziyorsa direkt arama seçeneği sun
    if (results.length === 0) {
      const isKapinoLike = /^[A-ZÜĞŞÇÖİ]-?\d{3,4}$/.test(q) || /^M\d{4}$/.test(q)
      const isPlateLike = /^34\s?[A-Z]{1,3}\s?\d{2,4}$/.test(q.replace(/\s+/g, ''))
      const isPartialKapino = /^[A-ZÜĞŞÇÖİ]-?\d{1,4}$/.test(q) // Partial like "C-1"
      
      if (isKapinoLike || isPlateLike || isPartialKapino) {
        results = [{ kapino: q.replace(/\s+/g, ''), plate: t('map.directSearch', 'Doğrudan Ara'), route_code: null }]
      }
    }

    return results
  }, [query, fleet, t])

  const hasChips = selectedRoutes.length > 0 || selectedStops.length > 0
  const showResults = showDropdown && query.trim().length >= 2 && (routeResults.length > 0 || stopResults.length > 0 || busResults.length > 0)

  return (
    <div className="flex flex-col gap-2 pointer-events-none w-full">
      
      {/* ── Status Bar + Fleet Toggle ── */}
      <div className="flex items-center justify-between pointer-events-auto">
        <button
          onClick={onToggleFleet}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shadow-lg backdrop-blur
            ${fleetVisible 
              ? 'bg-brand-600 text-white border-brand-500 hover:bg-brand-500' 
              : 'bg-surface-card/90 text-text-secondary border-surface-muted hover:text-text-primary hover:bg-surface-muted'}`}
        >
          {fleetVisible ? t('map.hideFleet', { defaultValue: 'Filoyu Gizle' }) : t('map.showFleet', { defaultValue: '🚌 Filoyu Göster' })}
        </button>
        
        <div className="bg-surface-card/90 backdrop-blur px-3 py-1.5 rounded-xl text-xs text-text-secondary border border-surface-muted shadow-lg">
          {busCount > 0 
            ? t('map.vehicleCount', { defaultValue: '{{count}} araç', count: busCount.toLocaleString() })
            : t('map.noVehicles', { defaultValue: 'Araç yok' })}
        </div>
      </div>

      {/* ── Main Panel (Chips + Search) ── */}
      <div 
        ref={dropdownRef}
        className="bg-surface-card border border-surface-border rounded-xl shadow-2xl pointer-events-auto flex flex-col relative"
      >
        {/* Dropdown Results (Opens UPWARDS, so it's above the panel) */}
        {showResults && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[300px] overflow-y-auto overscroll-contain z-10">
            
            {/* Routes */}
            {routeResults.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-muted/50">{t('stops.routes', 'Hatlar')}</div>
                {routeResults.map(r => (
                  <button
                    key={r.hat_kodu}
                    onClick={() => { onAddRoute(r.hat_kodu); setQuery(''); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-surface-muted transition-colors border-b border-surface-muted/50 last:border-0"
                  >
                    <span className="font-mono font-bold text-brand-400 text-xs shrink-0">{r.hat_kodu}</span>
                    <span className="text-text-secondary truncate">{r.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Stops */}
            {stopResults.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-muted/50">{t('routes.stops', 'Duraklar')}</div>
                {stopResults.map(s => (
                  <button
                    key={s.dcode}
                    onClick={() => { onAddStop(s.dcode, s.name); setQuery(''); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-surface-muted transition-colors border-b border-surface-muted/50 last:border-0"
                  >
                    <span className="text-xs shrink-0">📍</span>
                    <span className="text-text-secondary truncate flex-1">{s.name}</span>
                    <span className="font-mono text-[10px] text-text-muted shrink-0">#{s.dcode}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Buses */}
            {busResults.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-muted/50">{t('map.vehicles', 'Araçlar')}</div>
                {busResults.map(b => (
                  <button
                    key={b.kapino}
                    onClick={() => { onBusSearch(b.kapino); setQuery(''); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-surface-muted transition-colors border-b border-surface-muted/50 last:border-0"
                  >
                    <span className="text-xs shrink-0">🚌</span>
                    <span className="font-mono font-bold text-brand-400 text-xs shrink-0">{b.kapino}</span>
                    <span className="text-text-secondary truncate text-xs">{b.plate}</span>
                    {b.route_code && <span className="text-text-muted text-[10px] shrink-0 ml-auto bg-surface-muted px-1.5 py-0.5 rounded">{b.route_code}</span>}
                  </button>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Selected Chips */}
        {hasChips && (
          <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5 border-b border-surface-muted">
            {selectedRoutes.map((route, i) => {
              const color = PALETTE[i % PALETTE.length]
              return (
                <span
                  key={`r-${route}`}
                  className="inline-flex items-center gap-1 bg-brand-900/60 backdrop-blur
                             border text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                  style={{ borderColor: color, color: color }}
                >
                  {route}
                  <button
                    onClick={() => onRemoveRoute(route)}
                    className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none text-sm font-normal"
                    aria-label={t('stops.removeRouteFilter', { route, defaultValue: `Kaldır ${route}` })}
                  >
                    ×
                  </button>
                </span>
              )
            })}
            
            {selectedStops.map((stop) => (
              <span
                key={`s-${stop.dcode}`}
                className="inline-flex items-center gap-1 bg-surface-muted backdrop-blur
                           border border-surface-border text-text-primary text-xs font-bold px-2.5 py-1 rounded-full"
              >
                📍 {stop.name.split(' ')[0]} {/* Shorten name for chip */}
                <button
                  onClick={() => onRemoveStop(stop.dcode)}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none text-sm font-normal"
                  aria-label={t('stops.removeEntityFilter', { entity: stop.dcode, defaultValue: `Kaldır ${stop.dcode}` })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className="flex items-center px-4 py-3">
          <svg className="w-5 h-5 text-text-muted shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => { setShowDropdown(true); }}
            placeholder={t('map.unifiedSearchPlaceholder', { defaultValue: 'Hat, durak veya araç ara...' })}
            className="flex-1 bg-transparent border-none text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-0"
          />
          {query.length > 0 && (
            <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary p-1">
              &times;
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
