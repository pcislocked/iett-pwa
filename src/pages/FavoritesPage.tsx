import { Link } from 'react-router-dom'
import { useFavorites, type Favorite } from '@/hooks/useFavorites'

function FavItem({ fav, onRemove }: { fav: Favorite; onRemove: () => void }) {
  const isStop = fav.kind === 'stop'
  const to = isStop ? `/stops/${fav.dcode}` : `/routes/${fav.hat_kodu}`
  const code = isStop ? fav.dcode : fav.hat_kodu

  return (
    <div className="card flex items-center gap-3 py-3">
      <div className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
        isStop ? 'bg-brand-900 text-brand-100' : 'bg-amber-900/60 text-amber-200'
      }`}>
        {isStop ? 'DURAK' : 'HAT'}
      </div>

      <Link to={to} className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 truncate">{fav.name}</p>
        <p className="text-[11px] text-slate-500 font-mono">#{code}</p>
      </Link>

      <Link
        to={to}
        className="text-brand-400 text-xs font-medium shrink-0 px-2 py-1 rounded-lg
                   bg-brand-600/10 hover:bg-brand-600/20 transition-colors"
      >
        Aç
      </Link>

      <button
        onClick={onRemove}
        className="text-slate-600 hover:text-rose-400 transition-colors p-1 shrink-0"
        aria-label="Favoriden kaldır"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

export default function FavoritesPage() {
  const { favorites, toggle } = useFavorites()

  const stops = favorites.filter((f) => f.kind === 'stop')
  const routes = favorites.filter((f) => f.kind === 'route')

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-muted">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-100">Favorilerim</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {favorites.length} kayıtlı öğe
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-28 flex flex-col gap-6">
        {favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <svg className="w-14 h-14 mb-4 opacity-30" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <p className="text-sm font-medium">Henüz favori eklemediniz</p>
            <p className="text-xs mt-1 text-center max-w-[200px]">
              Durak veya hat sayfalarındaki ❤ ikonuna tıklayarak ekleyebilirsiniz
            </p>
          </div>
        )}

        {stops.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Duraklar ({stops.length})
            </h2>
            <div className="flex flex-col gap-2">
              {stops.map((f) => (
                <FavItem key={`stop-${f.kind === 'stop' ? f.dcode : ''}`} fav={f} onRemove={() => toggle(f)} />
              ))}
            </div>
          </section>
        )}

        {routes.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Hatlar ({routes.length})
            </h2>
            <div className="flex flex-col gap-2">
              {routes.map((f) => (
                <FavItem key={`route-${f.kind === 'route' ? f.hat_kodu : ''}`} fav={f} onRemove={() => toggle(f)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
