import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { useArrivals } from '@/hooks/useArrivals'
import { api, type StopDetail } from '@/api/client'

/* ── Jiggle keyframe injected once ─────────────────────────────────────── */
const JIGGLE_STYLE = `
@keyframes pinned-jiggle {
  0%,100% { transform: rotate(0deg) }
  20%      { transform: rotate(-1.8deg) }
  40%      { transform: rotate( 1.8deg) }
  60%      { transform: rotate(-1.4deg) }
  80%      { transform: rotate( 1.4deg) }
}
`
let styleInjected = false
function ensureStyle() {
  if (styleInjected) return
  styleInjected = true
  const el = document.createElement('style')
  el.textContent = JIGGLE_STYLE
  document.head.appendChild(el)
}

/* ── Single row ─────────────────────────────────────────────────────────── */
function PinnedRow({
  dcode,
  nick,
  editing,
  onUnpin,
}: {
  dcode: string
  nick: string
  editing: boolean
  onUnpin: () => void
}) {
  const navigate = useNavigate()
  const { data: arrivals, loading } = useArrivals(dcode)
  const [stopDetail, setStopDetail] = useState<StopDetail | null>(null)
  const top2 = arrivals?.slice(0, 2) ?? []

  useEffect(() => {
    api.stops.detail(dcode).then(setStopDetail).catch(() => {})
  }, [dcode])

  return (
    <div
      style={
        editing
          ? { animation: 'pinned-jiggle 0.22s linear infinite', position: 'relative' }
          : { position: 'relative' }
      }
      className="relative"
    >
      {/* ── Unpin button (edit mode) ── */}
      {editing && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnpin() }}
          aria-label="Kaldır"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10
                     w-6 h-6 rounded-full flex items-center justify-center
                     border border-[#555] bg-[#1a1a1a] text-red-400
                     active:bg-red-600 active:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* ── Stop row ── */}
      <button
        onClick={() => { if (!editing) navigate(`/stops/${dcode}`) }}
        className={`w-full flex items-center gap-3 py-3 min-h-[56px]
                    bg-surface-card active:bg-surface-muted transition-colors text-left
                    ${editing ? 'pl-10 pr-4 cursor-default' : 'px-4'}`}
        disabled={editing}
      >
        <span className="text-base shrink-0">📌</span>

        {/* Name + direction */}
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-bold text-white truncate block leading-tight">{nick}</span>
          <span className="text-[10px] text-slate-500 truncate block">
            {stopDetail?.direction
              ? `→ ${stopDetail.direction}`
              : <span className="font-mono text-slate-700">{dcode}</span>}
          </span>
        </div>

        {/* Arrival pills (hidden in edit mode to save space) */}
        {!editing && (
          <div className="flex items-center gap-1.5 shrink-0">
            {loading && top2.length === 0 ? (
              <>
                <span className="w-12 h-4 rounded-full bg-surface-muted animate-pulse" />
                <span className="w-12 h-4 rounded-full bg-surface-muted animate-pulse opacity-50" />
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
                  <span key={`${a.route_code}-${a.eta_raw ?? ''}`}
                        className={`text-[11px] font-bold font-mono ${color}`}>
                    {a.route_code}:{eta}
                  </span>
                )
              })
            ) : (
              <span className="text-[11px] text-slate-600">—</span>
            )}
          </div>
        )}

        {/* Chevron (only when not editing) */}
        {!editing && (
          <svg className="w-3.5 h-3.5 text-slate-700 shrink-0 ml-1" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )}
      </button>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function PinnedManagePage() {
  ensureStyle()
  const navigate = useNavigate()
  const { prefs, unpinStop } = useUserPrefs()
  const { pinnedStops } = prefs
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto">

      {/* Header */}
      <div className="px-4 safe-area-pt pt-4 pb-3 flex items-center justify-between border-b border-[#111]">
        <h1 className="text-base font-bold text-white">Sabitlenmiş Duraklar</h1>
        {pinnedStops.length > 0 && (
          <button
            onClick={() => setEditing((e) => !e)}
            className="text-[12px] font-semibold tracking-wide metro-tilt"
            style={{ color: editing ? '#fff' : 'var(--wp-accent)' }}
          >
            {editing ? 'Bitti' : 'Düzenle'}
          </button>
        )}
      </div>

      {/* List */}
      {pinnedStops.length > 0 ? (
        <div>
          {pinnedStops.map((p) => (
            <PinnedRow
              key={p.dcode}
              dcode={p.dcode}
              nick={p.nick}
              editing={editing}
              onUnpin={() => unpinStop(p.dcode)}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 opacity-40">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-sm">Sabitlenmiş durak yok</p>
          <p className="text-xs text-center" style={{ color: '#333', maxWidth: 220 }}>
            Durak sayfasındaki 📌 butonuna dokunarak sabitleyebilirsin
          </p>
        </div>
      )}

      {/* Add button */}
      {pinnedStops.length < 4 && (
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-3 px-4 py-4 border-t border-[#111]
                     active:bg-surface-muted transition-colors text-left"
          style={{ color: 'var(--wp-accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-sm font-semibold">Durak Ekle</span>
          <span className="text-xs ml-auto" style={{ color: '#333' }}>{pinnedStops.length} / 4</span>
        </button>
      )}

    </div>
  )
}
