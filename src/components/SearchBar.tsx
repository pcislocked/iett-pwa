import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type StopSearchResult, type RouteSearchResult } from '@/api/client'

type SearchResult =
  | ({ kind: 'stop' } & StopSearchResult)
  | ({ kind: 'route' } & RouteSearchResult)

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
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
    if (r.kind === 'stop') navigate(`/stops/${r.dcode}`)
    else navigate(`/routes/${r.hat_kodu}`)
  }

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Durak adı veya hat numarası..."
        className="w-full bg-surface-card border border-surface-muted rounded-xl
                   px-4 py-3 text-slate-100 placeholder-slate-500
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
