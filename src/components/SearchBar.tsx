import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type StopSearchResult, type RouteSearchResult } from '@/api/client'
import { addRecent } from '@/hooks/useRecentSearches'

type SearchResult =
  | ({ kind: 'stop' } & StopSearchResult)
  | ({ kind: 'route' } & RouteSearchResult)
  | { kind: 'stop-direct'; dcode: string }

interface Props {
  placeholder?: string
  autoFocus?: boolean
}

export default function SearchBar({ placeholder = 'Hat kodu, durak adı...', autoFocus }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    // Numeric-only input ≥ 4 digits → treat as dcode, skip API
    if (/^\d{4,}$/.test(q)) {
      setResults([{ kind: 'stop-direct', dcode: q }])
      setOpen(true)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const [stops, routes] = await Promise.all([
          api.stops.search(query),
          api.routes.search(query),
        ])
        const combined: SearchResult[] = [
          ...stops.map((s) => ({ kind: 'stop' as const, ...s })),
          ...routes.map((r) => ({ kind: 'route' as const, ...r })),
        ]
        setResults(combined)
        setOpen(combined.length > 0)
      } catch {
        setResults([])
      }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  function handleSelect(r: SearchResult) {
    setOpen(false)
    setQuery('')
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

  return (
    <div className="relative w-full">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full bg-surface-card border border-surface-muted rounded-2xl
                   pl-10 pr-4 py-3.5 text-slate-100 placeholder-slate-500 text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {open && (
        <ul className="absolute top-full mt-1 w-full bg-surface-card border border-surface-muted
                       rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-4 py-3 hover:bg-surface-muted transition-colors
                           flex items-center gap-3"
                onClick={() => handleSelect(r)}
              >
                {r.kind === 'stop-direct' ? (
                  <>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-100">
                      KOD
                    </span>
                    <span className="truncate text-sm text-slate-200">
                      Durak #{r.dcode} sayfasına git
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      r.kind === 'stop'
                        ? 'bg-brand-900 text-brand-100'
                        : 'bg-amber-900 text-amber-100'
                    }`}>
                      {r.kind === 'stop' ? 'DURAK' : 'HAT'}
                    </span>
                    <span className="truncate text-sm">
                      {r.kind === 'stop' ? r.name : `${r.hat_kodu} — ${r.name}`}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}
