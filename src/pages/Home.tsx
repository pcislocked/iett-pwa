import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '@/components/SearchBar'
import { getRecent, type RecentSearch } from '@/hooks/useRecentSearches'

const quickTiles = [
  {
    label: 'Yakın Duraklar',
    desc: 'Konumuna en yakın duraklar',
    to: '/nearby',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    label: 'Sefer Saatleri',
    desc: 'Hat bazlı sefer saatlerini gör',
    to: null,
    placeholder: '14M',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
  {
    label: 'Favoriler',
    desc: 'Kayıtlı durak ve hatlarım',
    to: '/favorites',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [recents, setRecents] = useState<RecentSearch[]>([])
  const [showScheduleInput, setShowScheduleInput] = useState(false)
  const [scheduleInput, setScheduleInput] = useState('')

  useEffect(() => {
    setRecents(getRecent())
  }, [])

  function handleScheduleGo() {
    const code = scheduleInput.trim().toUpperCase()
    if (code) navigate(`/routes/${code}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="relative"
           style={{ background: 'linear-gradient(160deg, #0c1a3a 0%, #1a3460 40%, #0f2548 70%, #0f172a 100%)' }}>
        {/* Decorative lines (Bosphorus bridge silhouette hint) */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <path d="M0 120 Q100 60 200 80 Q300 100 400 70" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M0 140 Q100 80 200 100 Q300 120 400 90" stroke="white" strokeWidth="1" fill="none"/>
            <line x1="130" y1="40" x2="130" y2="120" stroke="white" strokeWidth="1"/>
            <line x1="270" y1="40" x2="270" y2="110" stroke="white" strokeWidth="1"/>
            {/* cables */}
            {[10,30,50,70,90].map((x) => (
              <line key={x} x1={130} y1={60} x2={130 - x} y2={110} stroke="white" strokeWidth="0.5"/>
            ))}
            {[10,30,50,70,90].map((x) => (
              <line key={x} x1={270} y1={55} x2={270 + x} y2={105} stroke="white" strokeWidth="0.5"/>
            ))}
          </svg>
        </div>

        <div className="relative px-5 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-1">
            {/* Bus icon */}
            <svg className="w-7 h-7 text-brand-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2c4.42 0 8 .5 8 4v9.5C20 17.43 18.93 18.5 17.5 18.5c0 0-.8 1-1.5 1.5H8c-.7-.5-1.5-1.5-1.5-1.5C5.07 18.5 4 17.43 4 15.5V6c0-3.5 3.58-4 8-4zm0 2c-3.78 0-6 .45-6 2v6h12V6c0-1.55-2.22-2-6-2zM7.5 17a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 13V8h12v5H6z"/>
            </svg>
            <h1 className="text-2xl font-bold text-white tracking-tight">İETT Canlı</h1>
          </div>
          <p className="text-slate-400 text-sm mb-6">İstanbul otobüslerini gerçek zamanlı takip et</p>

          {/* Search */}
          <SearchBar placeholder="Hat kodu, durak adı veya durak kodu..." />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pt-5 pb-28 flex flex-col gap-6 max-w-2xl w-full mx-auto">

        {/* Quick tiles */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Hızlı Erişim
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {quickTiles.map((tile) =>
              tile.to ? (
                <button
                  key={tile.label}
                  onClick={() => navigate(tile.to!)}
                  className="card flex flex-col items-center text-center gap-2 py-4 hover:border-slate-500 transition-colors active:scale-95"
                >
                  <span className={`${tile.color} ${tile.bg} p-2.5 rounded-xl`}>{tile.icon}</span>
                  <span className="text-xs font-semibold text-slate-200 leading-tight">{tile.label}</span>
                </button>
              ) : (
                <div key={tile.label} className="card flex flex-col items-center text-center gap-2 py-4 relative">
                  <span className={`${tile.color} ${tile.bg} p-2.5 rounded-xl`}>{tile.icon}</span>
                  <span className="text-xs font-semibold text-slate-200 leading-tight">{tile.label}</span>
                  {showScheduleInput ? (
                    <div className="absolute inset-0 bg-surface-card rounded-2xl flex items-center gap-1 px-2">
                      <input
                        autoFocus
                        value={scheduleInput}
                        onChange={(e) => setScheduleInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleScheduleGo(); if (e.key === 'Escape') setShowScheduleInput(false) }}
                        placeholder="14M"
                        className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none w-0 min-w-0"
                      />
                      <button onClick={handleScheduleGo}
                              className="text-brand-400 text-xs font-bold shrink-0">Git</button>
                      <button onClick={() => setShowScheduleInput(false)}
                              className="text-slate-500 text-xs shrink-0">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowScheduleInput(true)}
                      className="absolute inset-0 rounded-2xl"
                      aria-label="Sefer saatleri"
                    />
                  )}
                </div>
              )
            )}
          </div>
        </section>

        {/* Recent searches */}
        {recents.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Son Aramalar
            </h2>
            <div className="card p-0 overflow-hidden divide-y divide-surface-muted">
              {recents.map((r) => (
                <button
                  key={`${r.kind}-${r.code}`}
                  onClick={() => navigate(r.kind === 'stop' ? `/stops/${r.code}` : `/routes/${r.code}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors text-left"
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    r.kind === 'stop'
                      ? 'bg-brand-900 text-brand-100'
                      : 'bg-amber-900/60 text-amber-200'
                  }`}>
                    {r.kind === 'stop' ? 'DURAK' : 'HAT'}
                  </span>
                  <span className="flex-1 text-sm text-slate-200 truncate">{r.name}</span>
                  <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                  </svg>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
