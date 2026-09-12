import { Link } from 'react-router-dom'
import { useFavorites, type Favorite } from '@/hooks/useFavorites'
import { useTranslation } from 'react-i18next'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function FavItem({ fav, onRemove }: { fav: Favorite; onRemove: () => void }) {
  const { t } = useTranslation()
  const isStop = fav.kind === 'stop'
  const to = isStop ? `/stops/${fav.dcode}` : `/routes/${fav.hat_kodu}`
  const code = isStop ? fav.dcode : fav.hat_kodu

  return (
    <div className="card flex items-center gap-3 py-3">
      <div className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
        isStop ? 'bg-brand-900 text-brand-100' : 'bg-amber-900/60 text-amber-200'
      }`}>
        {code}
      </div>

      <Link to={to} className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{fav.name}</p>
      </Link>

      <Link
        to={to}
        className="text-brand-400 text-xs font-medium shrink-0 px-2 py-1 rounded-lg
                   bg-brand-600/10 hover:bg-brand-600/20 transition-colors"
      >
        {t('favorites.open', { defaultValue: 'Aç' })}
      </Link>

      <button
        onClick={onRemove}
        className="text-text-muted hover:text-rose-400 transition-colors p-1 shrink-0"
        aria-label={t('favorites.remove', { defaultValue: 'Favoriden kaldır' })}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

function SortableFavItem({ fav, onRemove }: { fav: Favorite; onRemove: () => void }) {
  const id = fav.kind === 'stop' ? `stop-${fav.dcode}` : `route-${fav.hat_kodu}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <FavItem fav={fav} onRemove={onRemove} />
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors touch-none opacity-50 hover:opacity-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  const { t } = useTranslation()
  const { favorites, toggle, reorder } = useFavorites()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = favorites.findIndex(f => (f.kind === 'stop' ? `stop-${f.dcode}` : `route-${f.hat_kodu}`) === active.id)
      const newIndex = favorites.findIndex(f => (f.kind === 'stop' ? `stop-${f.dcode}` : `route-${f.hat_kodu}`) === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        reorder(arrayMove(favorites, oldIndex, newIndex))
      }
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-card border-b border-surface-muted">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-text-primary">{t('favorites.title', { defaultValue: 'Favorilerim' })}</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {t('favorites.savedItems', { defaultValue: '{{count}} kayıtlı öge', count: favorites.length })}
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-6 flex flex-col gap-6">
        {favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <svg className="w-14 h-14 mb-4 opacity-30" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <p className="text-sm font-medium">{t('favorites.emptyTitle', { defaultValue: 'Henüz favori eklemediniz' })}</p>
            <p className="text-xs mt-1 text-center max-w-[200px]">
              {t('favorites.emptyDesc', { defaultValue: 'Durak veya hat sayfalarındaki ⭐ ikonuna tıklayarak ekleyebilirsiniz' })}
            </p>
          </div>
        )}

        {favorites.length > 0 && (
          <section>
            <div className="flex flex-col gap-2 pl-4 pr-1">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={favorites.map(f => f.kind === 'stop' ? `stop-${f.dcode}` : `route-${f.hat_kodu}`)} strategy={verticalListSortingStrategy}>
                  {favorites.map((f) => (
                    <SortableFavItem key={f.kind === 'stop' ? `stop-${f.dcode}` : `route-${f.hat_kodu}`} fav={f} onRemove={() => toggle(f)} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
