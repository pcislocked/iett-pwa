import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PINNED_STOPS_MAX, useUserPrefs } from '@/hooks/useUserPrefs'
import { useArrivals } from '@/hooks/useArrivals'
import { api, type StopDetail, type Arrival } from '@/api/client'
import { etaTextClass } from '@/utils/etaColor'
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

// Jiggle removed as requested

/* ── Single row ─────────────────────────────────────────────────────────── */
function PinnedRow({
  dcode,
  nick,
  editing,
  onUnpin,
}: {
  dcode: string
  nick: string
  editing: boolean
  onUnpin: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: arrivals, loading } = useArrivals(dcode)
  const [stopDetail, setStopDetail] = useState<StopDetail | null>(null)
  const top2 = arrivals?.slice(0, 2) ?? []

  useEffect(() => {
    api.stops.detail(dcode).then(setStopDetail).catch(() => {})
  }, [dcode])

  return (
    <div className="relative">
      {/* ── Unpin button (edit mode) ── */}
      {editing && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnpin() }}
          aria-label={t('pinned.remove', { defaultValue: 'Kaldır' })}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10
                     w-6 h-6 rounded-full flex items-center justify-center
                     text-[11px] font-bold text-red-500 hover:bg-red-500/10
                     active:bg-red-600 active:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* ── Stop row ── */}
      <button
        onClick={() => { if (!editing) navigate(`/stops/${dcode}`) }}
        className={`w-full flex items-center gap-3 py-3 min-h-[56px]
                    bg-surface-card active:bg-surface-muted transition-colors text-left
                    ${editing ? 'pl-10 pr-4 cursor-default' : 'px-4'}`}
        disabled={editing}
      >
        <span className="text-base shrink-0">📌</span>

        {/* Name + direction */}
        <div className="flex-1 min-w-0 pr-4">
          <span className="text-[13px] font-bold text-text-primary truncate block leading-tight">{nick}</span>
          <span className="text-[10px] text-text-muted truncate block">
            {stopDetail?.direction
              ? `→ ${stopDetail.direction}`
              : <span className="font-mono text-slate-700">{dcode}</span>}
          </span>
        </div>

        {/* Arrival pills (hidden in edit mode to save space) */}
        {!editing && (
          <div className="flex items-center gap-1.5 shrink-0">
            {loading && top2.length === 0 ? (
              <>
                <span className="w-12 h-4 rounded-full bg-surface-muted animate-pulse" />
                <span className="w-12 h-4 rounded-full bg-surface-muted animate-pulse opacity-50" />
              </>
            ) : top2.length > 0 ? (
              top2.map((a: Arrival) => {
                const eta = a.eta_minutes !== null ? `${a.eta_minutes}dk` : a.eta_raw
                const color = etaTextClass(a.eta_minutes)
                return (
                  <span key={`${a.route_code}-${a.eta_raw ?? ''}`}
                        className={`text-[11px] font-bold font-mono ${color}`}>
                    {a.route_code}:{eta}
                  </span>
                )
              })
            ) : (
              <span className="text-[11px] text-text-muted">—</span>
            )}
          </div>
        )}

        {/* Chevron (only when not editing) */}
        {!editing && (
          <svg className="w-3.5 h-3.5 text-slate-700 shrink-0 ml-1" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )}
      </button>
    </div>
  )
}

function SortablePinnedRow({ id, ...props }: { id: string, dcode: string, nick: string, editing: boolean, onUnpin: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <PinnedRow {...props} />
      {props.editing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors touch-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </div>
      )}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function PinnedManagePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { prefs, unpinStop, reorderPinnedStops } = useUserPrefs()
  const { pinnedStops } = prefs
  const [editing, setEditing] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = pinnedStops.findIndex((s) => s.dcode === active.id)
      const newIndex = pinnedStops.findIndex((s) => s.dcode === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPinnedStops(arrayMove(pinnedStops, oldIndex, newIndex))
      }
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">

      {/* Header */}
      <div className="px-4 safe-area-pt mt-6 pt-4 pb-2 border-b border-surface-border flex items-center justify-between">
        <h1 className="text-base font-bold text-text-primary">{t('home.pinnedStops', { defaultValue: 'Sabitlenmiş Duraklar' })}</h1>
        {pinnedStops.length > 0 && (
          <button
            onClick={() => setEditing((e) => !e)}
            className="text-[12px] font-semibold tracking-wide metro-tilt"
            style={{ color: editing ? '#fff' : 'var(--wp-accent)' }}
          >
            {editing ? t('common.done', { defaultValue: 'Bitti' }) : t('common.edit', { defaultValue: 'Düzenle' })}
          </button>
        )}
      </div>

      {/* List */}
      {pinnedStops.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pinnedStops.map(p => p.dcode)} strategy={verticalListSortingStrategy}>
            <div>
              {pinnedStops.map((p) => (
                <SortablePinnedRow
                  key={p.dcode}
                  id={p.dcode}
                  dcode={p.dcode}
                  nick={p.nick}
                  editing={editing}
                  onUnpin={() => unpinStop(p.dcode)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 opacity-40">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-sm">{t('pinned.emptyTitle', { defaultValue: 'Sabitlenmiş durak yok' })}</p>
          <p className="text-xs text-center" style={{ color: 'var(--color-text-3)', maxWidth: 220 }}>
            {t('pinned.emptyDesc', { defaultValue: 'Durak sayfasındaki 📌 butonuna dokunarak sabitleyebilirsin' })}
          </p>
        </div>
      )}

      {/* Add button */}
      {pinnedStops.length < PINNED_STOPS_MAX && (
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-3 px-4 py-4 border-t border-surface-border
                     active:bg-surface-muted transition-colors text-left"
          style={{ color: 'var(--wp-accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-sm font-semibold">{t('pinned.addStop', { defaultValue: 'Durak Ekle' })}</span>
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-3)' }}>{pinnedStops.length} / {PINNED_STOPS_MAX}</span>
        </button>
      )}

    </div>
  )
}
