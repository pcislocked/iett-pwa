import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFleet } from '@/hooks/useFleet'
import { api } from '@/api/client'

export default function AracQueryPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ kapino: string; plate?: string; source: 'local' | 'remote' }>>([])

  const { data: fleet } = useFleet()

  useEffect(() => {
    const term = query.trim().toUpperCase()
    if (term.length < 1) {
      setSuggestions([])
      return
    }

    let results: Array<{ kapino: string; plate?: string; source: 'local' | 'remote' }> = []
    
    if (fleet) {
      // Find in local fleet first. Allow matching C1753 to C-1753
      const cleanTerm = term.replace(/-/g, '')
      const localMatches = fleet.filter(b => 
        b.kapino.replace(/-/g, '').includes(cleanTerm) || 
        b.plate?.toUpperCase().includes(term)
      )
      results = localMatches.map(b => ({ kapino: b.kapino, plate: b.plate || undefined, source: 'local' as const })).slice(0, 10)
    }

    if (results.length > 0) {
      setSuggestions(results)
    } else {
      // Fallback to remote if no local matches
      let active = true
      api.arac.suggest(term).then(remote => {
        if (!active) return
        setSuggestions(remote.map(r => ({ kapino: r.doorNumber, plate: r.plate, source: 'remote' })))
      }).catch(e => console.error(e))
      return () => { active = false }
    }
  }, [query, fleet])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase()
    // Auto-inject hyphen if it starts with a letter and is followed by a number/letter (e.g. C1 -> C-1)
    if (/^[A-Z][0-9A-Z]/.test(val) && val[1] !== '-') {
      val = val[0] + '-' + val.substring(1)
    }
    setQuery(val)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const val = query.trim().toUpperCase()
    navigate(`/arac/bus/${val}`)
  }

  return (
    <div className="flex flex-col h-full bg-bg relative">
      <div className="flex items-center gap-3 px-4 h-14 bg-surface-card border-b border-surface-border shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-brand-500 rounded-full active:bg-surface-muted transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">{t('arac.queryTitle', { defaultValue: 'Kapı No Sorgulama' })}</h1>
      </div>

      <div className="p-4 max-w-md mx-auto w-full mt-4 flex flex-col h-full">
        <p className="text-text-muted text-sm mb-6 text-center shrink-0">
          {t('arac.queryDesc', { defaultValue: 'arac.iett.gov.tr üzerinden araç kapı numarası ile detaylı bilgi alın.' })}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 shrink-0 relative z-10">
          <div>
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder={t('arac.queryPlaceholder', { defaultValue: 'Örn: O-3124, K-1234...' })}
              className="w-full bg-surface-card border-2 border-surface-muted rounded-xl px-4 py-4 text-xl font-bold text-center uppercase focus:border-brand-500 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-500 text-black font-extrabold py-4 rounded-xl active:scale-95 transition-transform text-lg mt-2"
          >
            Sorgula
          </button>
        </form>

        {/* Suggestions List */}
        {suggestions.length > 0 && (
          <div className="mt-4 flex-1 overflow-y-auto pb-8">
            <h3 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wide px-2">{t('arac.results', { defaultValue: 'Sonuçlar' })}</h3>
            <div className="flex flex-col gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.kapino}-${idx}`}
                  onClick={() => navigate(`/arac/bus/${s.kapino}`)}
                  className="flex items-center justify-between p-4 bg-surface-card border border-surface-border rounded-xl active:bg-surface-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-muted text-brand-500 font-bold">
                      {s.kapino.charAt(0)}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary text-lg leading-tight">{s.kapino}</span>
                      {s.plate && <span className="text-xs font-mono text-text-secondary mt-0.5">{s.plate}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-text-muted">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {s.source === 'local' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">{t('arac.live', { defaultValue: 'Canlı' })}</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wider">{t('arac.remote', { defaultValue: 'Uzak' })}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
