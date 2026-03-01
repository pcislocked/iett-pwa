import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArrivals } from '@/hooks/useArrivals'
import { api, type StopDetail } from '@/api/client'

interface PinnedStopRowProps {
  dcode: string
  nick: string
  icon?: '📌' | '📍'
  distLabel?: string   // e.g. "220m" — for nearby rows
}

/**
 * A single pinned-stop or nearby-stop row on the Home page.
 * Shows up to 2 upcoming arrivals inline as `HAT:Xdk` pills.
 */
export default function PinnedStopRow({ dcode, nick, icon = '📌', distLabel }: PinnedStopRowProps) {
  const navigate = useNavigate()
  const { data: arrivals, loading } = useArrivals(dcode)
  const [stopDetail, setStopDetail] = useState<StopDetail | null>(null)

  useEffect(() => {
    api.stops.detail(dcode).then(setStopDetail).catch(() => {})
  }, [dcode])

  const top2 = arrivals?.slice(0, 2) ?? []

  return (
    <button
      onClick={() => navigate(`/stops/${dcode}`)}
      className="w-full flex items-center gap-3 px-4 py-3 min-h-[52px]
                 bg-surface-card
                 active:bg-surface-muted transition-colors text-left"
    >
      <span className="text-base shrink-0">{icon}</span>

      {/* Stop name + direction */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-bold text-white truncate block leading-tight">{nick}</span>
        <span className="text-[10px] text-slate-500 truncate block">
          {stopDetail?.direction
            ? `→ ${stopDetail.direction}`
            : distLabel
              ? ''
              : <span className="font-mono text-slate-700">{dcode}</span>}
        </span>
      </div>

      {/* Arrival pills */}
      <div className="flex items-center gap-1.5 shrink-0">
        {loading && top2.length === 0 ? (
          // Skeleton pulse
          <>
            <span className="w-14 h-5 rounded-full bg-surface-muted animate-pulse" />
            <span className="w-14 h-5 rounded-full bg-surface-muted animate-pulse opacity-50" />
          </>
        ) : top2.length > 0 ? (
          top2.map((a) => {
            const eta = a.eta_minutes !== null ? `${a.eta_minutes}dk` : a.eta_raw
            const color =
              a.eta_minutes !== null && a.eta_minutes < 5
                ? 'text-eta-soon'
                : a.eta_minutes !== null && a.eta_minutes < 15
                  ? 'text-eta-coming'
                  : 'text-slate-500'
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
          <span className="text-[11px] text-slate-600">—</span>
        )}

        {/* Distance badge for nearby rows */}
        {distLabel && (
          <span className="text-[10px] text-slate-600 bg-surface-muted px-1.5 py-0.5 rounded-full ml-1">
            {distLabel}
          </span>
        )}
      </div>

      {/* Chevron */}
      <svg className="w-3.5 h-3.5 text-slate-700 shrink-0 ml-1" fill="none"
           viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  )
}
