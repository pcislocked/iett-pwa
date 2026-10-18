import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type StopSearchResult, type RouteSearchResult } from '@/api/client'
import { addRecent } from '@/hooks/useRecentSearches'
import { parseIettShare } from '@/utils/urlResolver'

type SearchResult =
  | ({ kind: 'stop' } & StopSearchResult)
  | ({ kind: 'route' } & RouteSearchResult)
  | { kind: 'stop-direct'; dcode: string }

interface Props {
  placeholder?: string
  autoFocus?: boolean
}

export default function SearchBar({ placeholder, autoFocus }: Props) {
  const { t } = useTranslation()
  const actualPlaceholder = placeholder || t('search.placeholder', { defaultValue: 'Hat kodu, durak adı...' })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const abortControllerRef = useRef<AbortController | null>(null)

  const getSearchDebounceMs = (len: number): number => {
    if (len === 1) return 700
    if (len <= 3) return 300
    return 150
  }

  const executeSearch = async (q: string, signal: AbortSignal) => {
    try {
      if (q.length === 1) {
        const routes = await api.routes.search(q, { signal })
        if (signal.aborted) return
        const combined: SearchResult[] = routes.map((r) => ({ kind: 'route' as const, ...r }))
        setResults(combined)
        setOpen(combined.length > 0)
      } else {
        const [stopsResult, routesResult] = await Promise.allSettled([
          api.stops.search(q, { signal }),
          api.routes.search(q, { signal }),
        ])

        if (signal.aborted) return

        const stops = stopsResult.status === 'fulfilled' ? stopsResult.value : []
        const routes = routesResult.status === 'fulfilled' ? routesResult.value : []

        const combined: SearchResult[] = [
          ...routes.map((r) => ({ kind: 'route' as const, ...r })),
          ...stops.map((s) => ({ kind: 'stop' as const, ...s })),
        ]
        setResults(combined)
        setOpen(combined.length > 0)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setResults([])
      setOpen(false)
    }
  }

  const runInstantSearch = () => {
    const q = query.trim().slice(0, 100)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()

    if (q.length < 1) {
      setResults([])
      setOpen(false)
      return
    }

    if (/^\d{4,}$/.test(q)) {
      setResults([{ kind: 'stop-direct', dcode: q }])
      setOpen(true)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    executeSearch(q, controller.signal)
  }

  useEffect(() => {
    const q = query.trim().slice(0, 100)
    if (q.length < 1) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
      setResults([])
      setOpen(false)
      return
    }
    // Numeric-only input ≥ 4 digits → treat as dcode, skip API
    if (/^\d{4,}$/.test(q)) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
      setResults([{ kind: 'stop-direct', dcode: q }])
      setOpen(true)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()

    const controller = new AbortController()
    abortControllerRef.current = controller

    const debounceMs = getSearchDebounceMs(q.length)
    timerRef.current = setTimeout(() => {
      executeSearch(q, controller.signal)
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controller.abort()
    }
  }, [query])

  function handleSelect(r: SearchResult) {
    setOpen(false)
    setQuery('')
    if (r.kind === 'stop-direct') {
      addRecent({ kind: 'stop', code: r.dcode, name: t('search.stopNumber', { defaultValue: 'Durak #{{code}}', code: r.dcode }) })
      navigate(`/stops/${r.dcode}`)
    } else if (r.kind === 'stop') {
      addRecent({ kind: 'stop', code: r.dcode, name: r.name, direction: r.direction })
      navigate(`/stops/${r.dcode}`)
    } else {
      addRecent({ kind: 'route', code: r.hat_kodu, name: r.name })
      navigate(`/routes/${r.hat_kodu}`)
    }
  }

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          runInstantSearch()
        }}
        className="relative"
      >
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runInstantSearch()
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (pasted && (pasted.includes('iett.istanbul') || pasted.includes('hkod=') || pasted.includes('dkod='))) {
              const resolved = parseIettShare(pasted)
              if (resolved?.kind === 'route') {
                e.preventDefault()
                addRecent({ kind: 'route', code: resolved.code, name: resolved.code })
                navigate(`/routes/${encodeURIComponent(resolved.code)}`)
              } else if (resolved?.kind === 'stop') {
                e.preventDefault()
                addRecent({ kind: 'stop', code: resolved.code, name: t('search.stopNumber', { defaultValue: 'Durak #{{code}}', code: resolved.code }) })
                navigate(`/stops/${encodeURIComponent(resolved.code)}`)
              }
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={actualPlaceholder}
          aria-label={actualPlaceholder}
          className="w-full bg-surface-card border border-surface-muted rounded-2xl
                     pl-10 pr-4 py-3.5 text-text-primary placeholder-slate-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </form>
      {open && (
        <ul className="absolute top-full mt-1 w-full bg-surface-card border border-surface-muted
                       rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto divide-y divide-surface-muted">
          {results.map((r, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-4 py-2.5 hover:bg-surface-muted transition-colors
                           flex items-center gap-3"
                onClick={() => handleSelect(r)}
              >
                {r.kind === 'stop-direct' ? (
                  <>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-100 font-mono shrink-0">
                      #{r.dcode}
                    </span>
                    <span className="truncate text-sm font-medium text-text-primary">
                      {t('search.goToStopPage', { defaultValue: 'Durak sayfasına git' })}
                    </span>
                  </>
                ) : r.kind === 'stop' ? (
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-900 text-brand-100 font-mono shrink-0">
                      #{r.dcode}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{r.name}</p>
                      {r.direction && (
                        <p className="truncate text-[10px] text-text-secondary mt-0.5">🧭 {r.direction}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-900/60 text-amber-200 font-mono shrink-0 min-w-[42px] text-center">
                      {r.hat_kodu}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{r.name}</p>
                      <p className="truncate text-[10px] text-text-muted mt-0.5">{t('search.route', { defaultValue: 'Hat' })}</p>
                    </div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
