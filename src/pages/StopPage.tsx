import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useArrivals } from '@/hooks/useArrivals'
import { usePolling } from '@/hooks/usePolling'
import { api, type Announcement } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'

function EtaChip({ minutes, raw }: { minutes: number | null; raw: string }) {
  if (minutes === null) return <span className="eta-chip eta-far">{raw}</span>
  if (minutes < 5)
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold
                        px-2.5 py-1 rounded-full min-w-[52px] justify-center">
        {minutes} dk
      </span>
    )
  if (minutes < 15)
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-bold
                        px-2.5 py-1 rounded-full min-w-[52px] justify-center">
        {minutes} dk
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 bg-surface-muted text-slate-300 text-xs font-semibold
                      px-2.5 py-1 rounded-full min-w-[52px] justify-center">
      {minutes} dk
    </span>
  )
}

export default function StopPage() {
  const { dcode } = useParams<{ dcode: string }>()
  const navigate = useNavigate()
  const [activeRoute, setActiveRoute] = useState<string | null>(null)
  const [showAnnouncements, setShowAnnouncements] = useState(false)

  const { data: arrivals, loading, error, stale } = useArrivals(dcode ?? '')

  // Route pills at this stop
  const routesFetcher = usePolling<string[]>(
    () => api.stops.routes(dcode ?? ''),
    300_000,
  )
  const routes = routesFetcher.data ?? []

  // Announcements for active route
  const announceFetcher = usePolling<Announcement[]>(
    () => api.routes.announcements(activeRoute ?? ''),
    300_000,
  )
  const announcements = activeRoute ? (announceFetcher.data ?? []) : []

  const { isFavorite, toggle } = useFavorites()
  const favItem = { kind: 'stop' as const, dcode: dcode ?? '', name: `Durak ${dcode}` }
  const favorited = isFavorite(favItem)

  // Auto-derive stop name from arrivals destination prefix if possible
  const stopName = `Durak ${dcode}`

  // Filtered arrivals by active route pill
  const filteredArrivals = activeRoute
    ? (arrivals ?? []).filter((a) => a.route_code === activeRoute)
    : (arrivals ?? [])

  if (!dcode) return null

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-muted sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-200 p-1 -ml-1 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 truncate">{stopName}</h1>
              <span className="text-[10px] bg-surface-muted text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                #{dcode}
              </span>
            </div>
            {stale && (
              <p className="text-[11px] text-amber-400">⚠ Son güncelleme başarısız</p>
            )}
          </div>

          <button
            onClick={() => toggle(favItem)}
            className={`p-1.5 rounded-xl transition-colors ${
              favorited ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <svg className="w-5 h-5" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        </div>

        {/* Route pills */}
        {routes.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveRoute(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                activeRoute === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-muted text-slate-300 hover:bg-slate-600'
              }`}
            >
              Tümü
            </button>
            {routes.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRoute(activeRoute === r ? null : r)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activeRoute === r
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-muted text-slate-300 hover:bg-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-28 pt-4 flex flex-col gap-3">
        {/* Error */}
        {error && !stale && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !arrivals && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="card h-16 animate-pulse bg-surface-muted border-0" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {arrivals && filteredArrivals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            <p className="text-sm font-medium">Şu an sefer bilgisi yok</p>
            {activeRoute && (
              <p className="text-xs mt-1">{activeRoute} hattı için gerçek zamanlı veri bulunamadı</p>
            )}
          </div>
        )}

        {/* Arrivals */}
        {filteredArrivals.map((a, i) => (
          <div
            key={`${a.route_code}-${a.destination}-${i}`}
            className="card flex items-center gap-3 py-3.5"
          >
            {/* Route badge */}
            <div className="bg-brand-600 text-white font-mono font-bold text-sm
                            rounded-xl px-3 py-2 min-w-[56px] text-center shrink-0 leading-tight">
              {a.route_code}
            </div>

            {/* Destination */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 truncate leading-snug">{a.destination}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{a.eta_raw}</p>
            </div>

            {/* ETA chip */}
            <EtaChip minutes={a.eta_minutes} raw={a.eta_raw} />
          </div>
        ))}

        {/* Announcements section */}
        {activeRoute && announcements.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              className="w-full card flex items-center justify-between text-sm text-amber-400 font-semibold"
            >
              <span>🔔 Sefer Duyuruları ({announcements.length})</span>
              <svg className={`w-4 h-4 transition-transform ${showAnnouncements ? 'rotate-180' : ''}`}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
              </svg>
            </button>
            {showAnnouncements && (
              <div className="mt-2 flex flex-col gap-2">
                {announcements.map((ann, i) => (
                  <div key={i} className="card border-amber-800/50 bg-amber-950/20">
                    <p className="text-xs font-semibold text-amber-400 mb-1">{ann.type}</p>
                    <p className="text-sm text-slate-300">{ann.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{ann.updated_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
