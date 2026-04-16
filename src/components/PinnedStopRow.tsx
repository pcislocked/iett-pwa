import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArrivals } from '@/hooks/useArrivals'
import { api, type StopDetail } from '@/api/client'
import { etaTextClass } from '@/utils/etaColor'

type StopDetailCacheRecord = { detail: StopDetail; timestamp: number }

const stopDetailCache = new Map<string, StopDetailCacheRecord>()
const stopDetailInFlight = new Map<string, Promise<StopDetail>>()
const STOP_DETAIL_CACHE_MAX_ENTRIES = 240
const STOP_DETAIL_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function setStopDetailCache(dcode: string, detail: StopDetail, timestamp: number = Date.now()) {
  stopDetailCache.delete(dcode)
  stopDetailCache.set(dcode, { detail, timestamp })
  if (stopDetailCache.size <= STOP_DETAIL_CACHE_MAX_ENTRIES) return
  const firstKey = stopDetailCache.keys().next().value
  if (firstKey) stopDetailCache.delete(firstKey)
}

function fetchStopDetailShared(dcode: string): Promise<StopDetail> {
  const now = Date.now()
  const cached = stopDetailCache.get(dcode)
  if (cached) {
    if (now - cached.timestamp < STOP_DETAIL_CACHE_TTL) {
      setStopDetailCache(dcode, cached.detail, cached.timestamp)
      return Promise.resolve(cached.detail)
    }
    stopDetailCache.delete(dcode)
  }

  const inflight = stopDetailInFlight.get(dcode)
  if (inflight) return inflight

  const request = api.stops.detail(dcode)
    .then((detail) => {
      setStopDetailCache(dcode, detail)
      return detail
    })
    .finally(() => {
      stopDetailInFlight.delete(dcode)
    })

  stopDetailInFlight.set(dcode, request)
  return request
}

interface PinnedStopRowProps {
  dcode: string
  nick: string
  icon?: string
  distLabel?: string   // e.g. "220m" — for nearby rows
  direction?: string | null  // optional override — skips the stops.detail() fetch
}

/**
 * A single pinned-stop or nearby-stop row on the Home page.
 * 3-line layout:
 *   Line 1 — icon + stop name + distance badge + chevron
 *   Line 2 — → direction (if available)
 *   Line 3 — arrival pills (up to 4)
 */
export default function PinnedStopRow({ dcode, nick, icon = '📌', distLabel, direction: directionProp }: PinnedStopRowProps) {
  const navigate = useNavigate()
  const { data: arrivals, loading } = useArrivals(dcode)
  const [stopDetail, setStopDetail] = useState<StopDetail | null>(null)

  useEffect(() => {
    if (directionProp != null) return  // direction already provided — skip extra fetch
    let cancelled = false
    fetchStopDetailShared(dcode)
      .then((detail) => {
        if (!cancelled) setStopDetail(detail)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [dcode, directionProp])

  const resolvedDirection = directionProp ?? stopDetail?.direction
  const top4 = arrivals?.slice(0, 4) ?? []

  return (
    <button
      onClick={() => navigate(`/stops/${dcode}`)}
      className="w-full px-4 py-2.5 min-h-[64px]
                 bg-surface-card
                 active:bg-surface-muted transition-colors text-left"
    >
      {/* Line 1: icon + name + distance + chevron */}
      <div className="flex items-center gap-2.5">
        <span className="text-base shrink-0 leading-none">{icon}</span>
        <span className="flex-1 text-[13px] font-bold text-white truncate leading-tight">{nick}</span>
        {distLabel && (
          <span className="text-[10px] text-slate-600 bg-surface-muted px-1.5 py-0.5 rounded-full shrink-0">
            {distLabel}
          </span>
        )}
        <svg className="w-3.5 h-3.5 text-slate-700 shrink-0" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Line 2: direction */}
      {resolvedDirection ? (
        <div className="mt-0.5 pl-[26px]">
          <span className="text-[10px] text-slate-500">→ {resolvedDirection}</span>
        </div>
      ) : !distLabel ? (
        <div className="mt-0.5 pl-[26px]">
          <span className="text-[10px] font-mono text-slate-700">{dcode}</span>
        </div>
      ) : null}

      {/* Line 3: arrival pills */}
      <div className="mt-1 pl-[26px] flex items-center flex-wrap gap-x-2.5 gap-y-0.5 min-h-[18px]">
        {loading && top4.length === 0 ? (
          <>
            <span className="w-14 h-4 rounded-full bg-surface-muted animate-pulse" />
            <span className="w-14 h-4 rounded-full bg-surface-muted animate-pulse opacity-50" />
          </>
        ) : top4.length > 0 ? (
          top4.map((a) => {
            const eta = a.eta_minutes !== null ? `${a.eta_minutes}dk` : a.eta_raw
            const color = etaTextClass(a.eta_minutes)
            return (
              <span
                key={`${a.route_code}-${a.eta_raw ?? ''}`}
                className={`text-[11px] font-bold font-mono ${color}`}
              >
                {a.route_code}:{eta}
              </span>
            )
          })
        ) : (
          <span className="text-[11px] text-slate-700">—</span>
        )}
      </div>
    </button>
  )
}
