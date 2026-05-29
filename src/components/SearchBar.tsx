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
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)
  const reqIdRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    let isMounted = true
    const q = query.trim()
    if (q.length < 2) {
      reqIdRef.current++
      setResults([])
      setOpen(false)
      return
    }
    // Numeric-only input ≥ 4 digits → treat as dcode, skip API
    if (/^\d{4,}$/.test(q)) {
      reqIdRef.current++
      setResults([{ kind: 'stop-direct', dcode: q }])
      setOpen(true)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    const myId = ++reqIdRef.current
    timerRef.current = setTimeout(async () => {
      try {
        const [stops, routes] = await Promise.all([
          api.stops.search(q),
          api.routes.search(q),
        ])
        if (!isMounted || myId !== reqIdRef.current) return
        const combined: SearchResult[] = [
          ...stops.map((s) => ({ kind: 'stop' as const, ...s })),
          ...routes.map((r) => ({ kind: 'route' as const, ...r })),
        ]
        setResults(combined)
        setOpen(combined.length > 0)
      } catch {
        if (isMounted && myId === reqIdRef.current) {
          setResults([])
        }
      }
    }, 300)
    return () => {
      isMounted = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [results])

  useEffect(() => {
    if (open && highlightedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('button')
      const activeItem = items[highlightedIndex]
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, open])

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        e.preventDefault()
        handleSelect(results[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setOpen(false)
    }
  }

  return (
    <div className="relative w-full" onBlur={handleBlur}>
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="search-results-list"
          aria-activedescendant={highlightedIndex >= 0 ? `search-opt-${highlightedIndex}` : undefined}
          className="w-full bg-surface-card border border-surface-muted rounded-2xl
                     pl-10 pr-4 py-3.5 text-slate-100 placeholder-slate-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {open && (
          <ul
            ref={dropdownRef}
            id="search-results-list"
            role="listbox"
            aria-label="Arama sonuçları"
            className="absolute top-full mt-1 w-full bg-surface-card border border-surface-muted
                           rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto"
          >
            {results.map((r, i) => (
              <li key={i}>
                <button
                  role="option"
                  id={`search-opt-${i}`}
                  aria-selected={highlightedIndex === i}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-muted transition-colors
                             flex items-center gap-3 ${
                               highlightedIndex === i ? 'bg-surface-muted outline-none ring-1 ring-inset ring-brand-500/50' : ''
                             }`}
                  onClick={() => handleSelect(r)}
                >
                  {r.kind === 'stop-direct' ? (
                    <>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-100 font-mono">
                        #{r.dcode}
                      </span>
                      <span className="truncate text-sm text-slate-200">
                        Durak sayfasına git
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono ${
                        r.kind === 'stop'
                          ? 'bg-brand-900 text-brand-100'
                          : 'bg-amber-900 text-amber-100'
                      }`}>
                        {r.kind === 'stop' ? r.dcode : r.hat_kodu}
                      </span>
                      <span className="truncate text-sm">
                        {r.name}
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
