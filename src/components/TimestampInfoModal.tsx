import { useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatGpsTimestamp } from '@/utils/dateUtils'
import { useNowTicker } from '@/hooks/useNowTicker'

export interface TimestampInfoModalProps {
  onClose: () => void
  onForceRefresh: () => void
  clientTime?: string
  serverTime?: string
  gpsTime?: string
  lastUpdated?: Date | string | null
  iettUpdatedAt?: string | null
  maxGpsTime?: string | null
  timestampMode?: 'relative' | 'absolute' | 'both'
}

export default function TimestampInfoModal({
  onClose,
  onForceRefresh,
  clientTime,
  serverTime,
  gpsTime,
  lastUpdated,
  iettUpdatedAt,
  maxGpsTime,
  timestampMode,
}: TimestampInfoModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const nowMs = useNowTicker(1000)

  const currentTimeFormatted = useMemo(() => {
    const d = new Date(nowMs)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }, [nowMs])

  const resolvedClientTime = useMemo(() => {
    if (lastUpdated !== undefined) {
      const ts = typeof lastUpdated === 'string' ? lastUpdated : lastUpdated?.toISOString() ?? null
      return formatGpsTimestamp(ts, timestampMode ?? 'relative', t, nowMs)
    }
    return clientTime ?? '--:--:--'
  }, [lastUpdated, timestampMode, t, nowMs, clientTime])

  const resolvedServerTime = useMemo(() => {
    if (iettUpdatedAt !== undefined) {
      return formatGpsTimestamp(iettUpdatedAt, timestampMode ?? 'relative', t, nowMs)
    }
    return serverTime ?? '--:--:--'
  }, [iettUpdatedAt, timestampMode, t, nowMs, serverTime])

  const resolvedGpsTime = useMemo(() => {
    if (maxGpsTime !== undefined) {
      return formatGpsTimestamp(maxGpsTime, timestampMode ?? 'relative', t, nowMs)
    }
    return gpsTime ?? '--:--:--'
  }, [maxGpsTime, timestampMode, t, nowMs, gpsTime])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    btnRef.current?.focus()
    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        if (!modalRef.current) return
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-sm bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-6"
      >
        <h2 id="info-title" className="text-lg font-bold text-text-primary mb-3">
          {t('stops.timestamps')}
        </h2>

        {/* Architecture flow diagram using emojis */}
        <div className="p-3 mb-4 bg-surface-muted/30 border border-surface-border rounded-xl flex flex-col items-center">
          {/* Top Node: iett-middle */}
          <div className="flex flex-col items-center text-center">
            <span className="text-2xl mb-0.5">☁️</span>
            <span className="text-[11px] font-bold text-brand-400 font-mono">iett-middle</span>
            <span className="text-[9px] text-text-muted">{t('stops.serverNodeSub')}</span>
          </div>

          {/* Connection Arrows: ↙ (middle -> pwa), ↖ (istanbul -> middle) */}
          <div className="w-full flex items-center justify-around px-8 my-1 text-text-muted text-xs font-bold font-mono">
            <span>↙</span>
            <span>↖</span>
          </div>

          {/* Bottom Nodes: Left = iett-pwa (Client), Right = iett.istanbul (Bus/Field) */}
          <div className="w-full flex items-center justify-between px-2">
            <div className="flex flex-col items-center text-center max-w-[100px]">
              <span className="text-2xl mb-0.5">📱</span>
              <span className="text-[11px] font-bold text-text-primary font-mono">iett-pwa</span>
              <span className="text-[9px] text-text-muted">{t('stops.clientNodeSub')}</span>
            </div>

            <div className="flex flex-col items-center text-center max-w-[100px]">
              <span className="text-2xl mb-0.5">🚌</span>
              <span className="text-[11px] font-bold text-text-primary font-mono">iett.istanbul</span>
              <span className="text-[9px] text-text-muted">{t('stops.fieldNodeSub')}</span>
            </div>
          </div>
        </div>

        <div tabIndex={0} className="text-xs text-text-secondary space-y-3 mb-6 overflow-y-auto max-h-[40vh]">
          {/* Live current device clock */}
          <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20 space-y-1">
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span className="flex items-center gap-1.5">
                <span>🕒</span>
                <span>{t('stops.cardNowTitle')}</span>
              </span>
              <span className="font-mono text-brand-400 font-bold text-sm tracking-wider">{currentTimeFormatted}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('stops.nowTimeDesc')}
            </p>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-xl border border-surface-border space-y-1">
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span>📱 {t('stops.cardClientTitle')}</span>
              <span className="font-mono text-brand-400">{resolvedClientTime}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('stops.timestampDescUpdate')}
            </p>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-xl border border-surface-border space-y-1">
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span>☁️ {t('stops.cardServerTitle')}</span>
              <span className="font-mono text-brand-400">{resolvedServerTime}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('stops.timestampDescIett')}
            </p>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-xl border border-surface-border space-y-1">
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span>🛰️ {t('stops.cardGpsTitle')}</span>
              <span className="font-mono text-brand-400">{resolvedGpsTime}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('stops.gpsTimeDesc')}
              {(resolvedGpsTime === '--:--:--' || resolvedGpsTime === '-' || !resolvedGpsTime) && (
                <span className="block mt-1 text-amber-400/90 font-medium">
                  {t('stops.gpsTimeNoBusesNote')}
                </span>
              )}
            </p>
          </div>

          <p className="text-[11px] text-amber-400/90 leading-relaxed px-1">
            {t('stops.timestampLagWarning')}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            ref={btnRef}
            onClick={() => {
              onClose()
              onForceRefresh()
            }}
            className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all"
          >
            {t('stops.forceRefresh')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-surface-muted hover:bg-surface-border text-text-secondary font-medium text-xs rounded-xl transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
