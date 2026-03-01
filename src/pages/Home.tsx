import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PinnedStopRow from '@/components/PinnedStopRow'
import { useUserPrefs, type PinnedStop } from '@/hooks/useUserPrefs'

/** Format current time HH:MM */
function useClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })),
      10_000,
    )
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Home() {
  const navigate = useNavigate()
  const clock = useClock()
  const { prefs } = useUserPrefs()
  const { pinnedStops } = prefs

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 safe-area-pt pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2c4.42 0 8 .5 8 4v9.5C20 17.43 18.93 18.5 17.5 18.5c0 0-.8 1-1.5 1.5H8c-.7-.5-1.5-1.5-1.5-1.5C5.07 18.5 4 17.43 4 15.5V6c0-3.5 3.58-4 8-4zm0 2c-3.78 0-6 .45-6 2v6h12V6c0-1.55-2.22-2-6-2zM7.5 17a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 13V8h12v5H6z" />
          </svg>
          <span className="font-bold text-white tracking-tight">İETT Canlı</span>
        </div>
        <span className="text-slate-500 tabular-nums text-sm">{clock}</span>
      </div>

      {/* ── Pinned stops ───────────────────────────────────────────────────── */}
      {pinnedStops.length > 0 && (
        <section className="px-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Sabitlenmiş Duraklar
            </h2>
            <button
              onClick={() => navigate('/search')}
              className="text-[11px] text-brand-400 font-medium"
            >
              + Ekle
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card">
            {pinnedStops.map((p: PinnedStop) => (
              <PinnedStopRow key={p.dcode} dcode={p.dcode} nick={p.nick} icon="📌" />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty-pinned CTA ───────────────────────────────────────────────── */}
      {pinnedStops.length === 0 && (
        <section className="px-4 mb-5">
          <button
            onClick={() => navigate('/search')}
            className="w-full rounded-2xl border border-dashed border-surface-border py-8
                       flex flex-col items-center gap-2 text-slate-600 active:bg-surface-muted
                       transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm">Durak sabitle</span>
            <span className="text-xs text-slate-700">Durak sayfasındaki 📌 butonuna dokun</span>
          </button>
        </section>
      )}

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <section className="px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
          Hızlı Erişim
        </h2>
        <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card">
          <Link to="/nearby"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted transition-colors active:bg-surface-muted">
            <span className="text-emerald-400 bg-emerald-400/10 p-2 rounded-xl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-100">Yakın Duraklar</div>
              <div className="text-xs text-slate-500">Konuma yakın durakları gör</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-600 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
          <Link to="/map"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted transition-colors active:bg-surface-muted">
            <span className="text-blue-400 bg-blue-400/10 p-2 rounded-xl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-100">Filo Haritası</div>
              <div className="text-xs text-slate-500">Tüm otobüsleri haritada gör</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-600 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
