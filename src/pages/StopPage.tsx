import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useArrivals } from '@/hooks/useArrivals'
import ArrivalCard from '@/components/ArrivalCard'

export default function StopPage() {
  const { dcode } = useParams<{ dcode: string }>()
  const [via, setVia] = useState('')
  const [viaInput, setViaInput] = useState('')

  const { data: arrivals, loading, error, refresh, stale } = useArrivals(dcode ?? '', via || undefined)

  const applyVia = useCallback(() => {
    setVia(viaInput.trim())
  }, [viaInput])

  const clearVia = useCallback(() => {
    setVia('')
    setViaInput('')
  }, [])

  if (!dcode) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Durak {dcode}</h1>
          <p className="text-xs text-slate-400">Otomatik yenileme: 20 sn</p>
        </div>
        <button onClick={refresh} className="btn-primary text-sm">
          Yenile
        </button>
      </div>

      {/* Via-stop filter */}
      <div className="card flex flex-col gap-2">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
          Via Durak Filtresi
        </p>
        <p className="text-xs text-slate-500">
          Sadece bu duraktan da geçen otobüsleri göster
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={viaInput}
            onChange={(e) => setViaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyVia() }}
            placeholder="Via durak kodu (örn: 216572)"
            className="flex-1 bg-surface border border-surface-muted rounded-lg
                       px-3 py-2 text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button onClick={applyVia} className="btn-primary text-sm">Uygula</button>
          {via && (
            <button onClick={clearVia} className="text-slate-400 hover:text-slate-200 px-2 text-sm">
              ✕
            </button>
          )}
        </div>
        {via && (
          <p className="text-xs text-brand-400">
            Filtre aktif: durak {via} üzerinden geçen hatlar gösteriliyor
          </p>
        )}
      </div>

      {/* Stale banner */}
      {stale && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-2 text-amber-300 text-sm">
          ⚠️ Son güncelleme başarısız — eski veri gösteriliyor
        </div>
      )}

      {/* Error */}
      {error && !stale && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-2 text-red-300 text-sm">
          Hata: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !arrivals && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="card h-16 animate-pulse bg-surface-muted" />
          ))}
        </div>
      )}

      {/* Arrivals list */}
      {arrivals && arrivals.length === 0 && (
        <div className="text-center text-slate-500 py-12">
          Şu an sefer bilgisi yok
        </div>
      )}
      {arrivals && arrivals.length > 0 && (
        <div className="flex flex-col gap-3">
          {arrivals.map((a, i) => (
            <ArrivalCard key={`${a.route_code}-${i}`} arrival={a} />
          ))}
        </div>
      )}
    </div>
  )
}
