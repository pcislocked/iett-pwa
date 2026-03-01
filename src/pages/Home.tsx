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
      <div className="px-4 safe-area-pt pt-3 pb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.15em] text-[#a6a6a6]">İETT Canlı</span>
        <span className="text-[#a6a6a6] tabular-nums text-xs">{clock}</span>
      </div>

      {/* ── Pinned stops ───────────────────────────────────────────────────── */}
      {pinnedStops.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <span className="metro-section p-0">Sabitlenmiş Duraklar</span>
            <button
              onClick={() => navigate('/search')}
              className="text-[11px] metro-tilt"
              style={{ color: 'var(--wp-accent)' }}
            >
              + Ekle
            </button>
          </div>
          <div>
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
            className="w-full py-8 flex flex-col items-center gap-2 metro-tilt"
            style={{ border: '1px solid #222', color: '#444' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm">Durak sabitle</span>
            <span className="text-xs" style={{ color: '#333' }}>Durak sayfasındaki 📌 butonuna dokun</span>
          </button>
        </section>
      )}

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <section>
        <p className="metro-section">Hızlı Erişim</p>
        <div>
          <Link to="/nearby"
            className="metro-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 shrink-0" style={{ color: 'var(--wp-accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">Yakın Duraklar</div>
              <div className="text-xs" style={{ color: 'var(--wp-text-sec)' }}>Konuma yakın durakları gör</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: '#444' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
          <Link to="/map"
            className="metro-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 shrink-0" style={{ color: 'var(--wp-accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">Filo Haritası</div>
              <div className="text-xs" style={{ color: 'var(--wp-text-sec)' }}>Tüm otobüsleri haritada gör</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: '#444' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
