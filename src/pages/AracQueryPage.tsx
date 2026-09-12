import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function AracQueryPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'route' | 'bus'>('route')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const val = query.trim().toUpperCase()
    if (type === 'route') {
      navigate(`/routes/${val}`)
    } else {
      navigate(`/arac/bus/${val}`)
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg relative">
      <div className="flex items-center gap-3 px-4 h-14 bg-surface-card border-b border-surface-border shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-brand-500 rounded-full active:bg-surface-muted transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">arac.iett Sorgulama</h1>
      </div>

      <div className="p-4 max-w-md mx-auto w-full mt-4">
        <p className="text-text-muted text-sm mb-6 text-center">
          Hat kodu veya araç kapı numarası ile doğrudan canlı harita takibi yapın.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex bg-surface-muted rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setType('route')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${type === 'route' ? 'bg-surface-card text-brand-500 shadow-sm' : 'text-text-muted hover:text-text-2'}`}
            >
              Hat Takibi
            </button>
            <button
              type="button"
              onClick={() => setType('bus')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${type === 'bus' ? 'bg-surface-card text-brand-500 shadow-sm' : 'text-text-muted hover:text-text-2'}`}
            >
              Araç (Kapı No) Takibi
            </button>
          </div>

          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={type === 'route' ? "Örn: 500T, 121A..." : "Örn: O3124, K1234..."}
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
      </div>
    </div>
  )
}
