import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type StopSearchResult, type RouteSearchResult } from '@/api/client'
import { addRecent, getRecent, type RecentSearch } from '@/hooks/useRecentSearches'
import { useUserPrefs } from '@/hooks/useUserPrefs'

type SearchResult =
  | ({ kind: 'stop' } & StopSearchResult)
  | ({ kind: 'route' } & RouteSearchResult)
  | { kind: 'stop-direct'; dcode: string }

export default function SearchPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recents, setRecents] = useState<RecentSearch[]>([])
  const { prefs } = useUserPrefs()
  const { favStops, favRoutes } = prefs

  useEffect(() => {
    setRecents(getRecent())
    // slight delay to avoid fighting page-transition animation
    const id = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    // BUG-09 / numeric shortcut: pure digits ≥ 4 → directly suggest dcode navigate
    if (/^\d{4,}$/.test(q)) {
      setResults([{ kind: 'stop-direct', dcode: q }])
      setLoading(false)
      return
    }
    setLoading(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const [stops, routes] = await Promise.all([
          api.stops.search(q),
          api.routes.search(q),
        ])
        const combined: SearchResult[] = [
          ...stops.map((s) => ({ kind: 'stop' as const, ...s })),
          ...routes.map((r) => ({ kind: 'route' as const, ...r })),
        ]
        setResults(combined)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  function handleSelect(r: SearchResult) {
    setQuery('')
    setResults([])
    if (r.kind === 'stop-direct') {
      navigate(`/stops/${r.dcode}`)
    } else if (r.kind === 'stop') {
      addRecent({ kind: 'stop', code: r.dcode, name: r.name })
      navigate(`/stops/${r.dcode}`)
    } else {
      addRecent({ kind: 'route', code: r.hat_kodu, name: r.name })
      navigate(`/routes/${r.hat_kodu}`)
    }
  }

  const showResults = query.trim().length >= 2

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Search input ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-safe-top pt-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            inputMode="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hat kodu, durak adı veya numara..."
            className="w-full bg-surface-card border border-surface-border rounded-2xl
                       pl-11 pr-10 py-3.5 text-slate-100 placeholder-slate-500 text-[15px]
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="Temizle"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Results or discovery ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {showResults ? (
          /* Search results list */
          loading ? (
            <div className="space-y-2 mt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-2xl bg-surface-card animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-slate-600 mt-10 text-sm">Sonuç bulunamadı</p>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card mt-1">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted
                             active:bg-surface-muted transition-colors text-left"
                >
                  {r.kind === 'stop-direct' ? (
                    <>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-100 font-mono shrink-0">
                        #{r.dcode}
                      </span>
                      <span className="text-sm text-slate-200 flex-1">Durak sayfasına git</span>
                    </>
                  ) : r.kind === 'stop' ? (
                    <>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-brand-900 text-brand-100 font-mono shrink-0">
                        {r.dcode}
                      </span>
                      <span className="text-sm text-slate-200 flex-1 truncate">{r.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 font-mono shrink-0">
                        {r.hat_kodu}
                      </span>
                      <span className="text-sm text-slate-200 flex-1 truncate">{r.name}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )
        ) : (
          /* Discovery: recents + fav stops/routes */
          <div className="space-y-5 mt-1">
            {recents.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Son Aramalar
                </h2>
                <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card">
                  {recents.slice(0, 6).map((r) => (
                    <button
                      key={`${r.kind}-${r.code}`}
                      onClick={() => navigate(r.kind === 'stop' ? `/stops/${r.code}` : `/routes/${r.code}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted
                                 active:bg-surface-muted transition-colors text-left"
                    >
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 font-mono ${
                        r.kind === 'stop' ? 'bg-brand-900 text-brand-100' : 'bg-amber-900/60 text-amber-200'
                      }`}>
                        {r.code}
                      </span>
                      <span className="flex-1 text-sm text-slate-200 truncate">{r.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {favStops.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Favori Duraklar
                </h2>
                <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card">
                  {favStops.map((stop) => (
                    <button
                      key={stop.dcode}
                      onClick={() => navigate(`/stops/${stop.dcode}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted
                                 active:bg-surface-muted transition-colors text-left"
                    >
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-900 text-brand-100 font-mono">
                        {stop.dcode}
                      </span>
                      <span className="flex-1 text-sm text-slate-200 truncate">{stop.name || stop.dcode}</span>
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-4 h-4 text-rose-500 shrink-0">
                        <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {(favRoutes as string[]).length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Favori Hatlar
                </h2>
                <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card">
                  {favRoutes.map((hatKodu) => (
                    <button
                      key={hatKodu}
                      onClick={() => navigate(`/routes/${hatKodu}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted
                                 active:bg-surface-muted transition-colors text-left"
                    >
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 font-mono">
                        {hatKodu}
                      </span>
                      <span className="flex-1 text-sm text-slate-200 truncate">{hatKodu}</span>
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-4 h-4 text-rose-500 shrink-0">
                        <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {recents.length === 0 && favStops.length === 0 && favRoutes.length === 0 && (
              <p className="text-center text-slate-600 mt-16 text-sm">
                Hat kodu, durak adı veya 4+ haneli durak numarası girin
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
