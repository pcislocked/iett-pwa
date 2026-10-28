import { useTranslation } from 'react-i18next'
import { useArrivals } from '@/hooks/useArrivals'
import { etaTextClass } from '@/utils/etaColor'
import type { NearbyStop } from '@/api/client'

export interface MapStopCardProps {
  stop: NearbyStop | {
    stop_code: string
    stop_name: string
    direction?: string | null
    district?: string | null
    latitude: number
    longitude: number
  }
  onClose: () => void
  onOpenStop: (stopCode: string) => void
}

export default function MapStopCard({ stop, onClose, onOpenStop }: MapStopCardProps) {
  const { t } = useTranslation()
  const { data: arrivals, loading } = useArrivals(stop.stop_code)

  const topArrivals = arrivals?.slice(0, 6) ?? []

  return (
    <div className="absolute bottom-[160px] left-0 right-0 z-[1001] pointer-events-none flex justify-center pb-2 px-2">
      <div className="pointer-events-auto w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl p-3.5 shadow-2xl backdrop-blur-md">
        
        {/* Top Row: Stop info & close */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center font-bold text-sm shrink-0">
              🚏
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-text-primary truncate">{stop.stop_name}</h3>
                <span className="text-[10px] font-mono text-text-muted bg-surface-muted px-1.5 py-0.5 rounded border border-surface-border">
                  #{stop.stop_code}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary truncate">
                {stop.district ? `${stop.district} · ` : ''}
                {stop.direction ? (
                  <span className="text-brand-400 font-medium">→ {stop.direction}</span>
                ) : (
                  <span>{t('map.noDirectionInfo', 'Yön Bilgisi Yok')}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 -mr-1 transition-colors"
            aria-label={t('common.close', 'Kapat')}
          >
            ✕
          </button>
        </div>

        {/* Middle Row: Oneliner Live ETA Strip */}
        <div className="mb-3 bg-surface/70 rounded-xl p-2 border border-surface-border/60">
          <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-1 flex items-center justify-between">
            <span>{t('map.upcomingBuses', 'Yaklaşan Araçlar')}</span>
            <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Canlı
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-h-[30px]">
            {loading && topArrivals.length === 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="w-16 h-6 rounded-lg bg-surface-muted animate-pulse" />
                <span className="w-16 h-6 rounded-lg bg-surface-muted animate-pulse opacity-60" />
                <span className="w-16 h-6 rounded-lg bg-surface-muted animate-pulse opacity-30" />
              </div>
            ) : topArrivals.length > 0 ? (
              topArrivals.map((a) => {
                const eta = a.eta_minutes !== null ? `${a.eta_minutes} ${t('common.min', 'dk')}` : (a.eta_raw ?? '-')
                const color = etaTextClass(a.eta_minutes)
                return (
                  <div
                    key={`${a.route_code}-${a.eta_raw ?? ''}-${a.destination ?? ''}`}
                    className="flex items-center gap-1.5 bg-surface-muted/90 px-2.5 py-1 rounded-lg border border-surface-border/80 shrink-0"
                  >
                    <span className="text-xs font-black text-brand-400 font-mono">{a.route_code}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className={`text-xs font-bold font-mono ${color}`}>{eta}</span>
                  </div>
                )
              })
            ) : (
              <span className="text-xs text-text-muted px-1">{t('map.noUpcomingBuses', 'Şu an yaklaşan araç görünmüyor')}</span>
            )}
          </div>
        </div>

        {/* Bottom Row: CTA Button */}
        <button
          onClick={() => onOpenStop(stop.stop_code)}
          className="w-full bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
        >
          <span>{t('map.openStop', 'Durağı Aç ve Tüm Saatleri Gör')}</span>
          <span className="text-sm">&rarr;</span>
        </button>

      </div>
    </div>
  )
}
