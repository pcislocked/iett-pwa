import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatGpsTimestamp } from '@/utils/dateUtils'
import { useNowTicker } from '@/hooks/useNowTicker'
import { useHorizontalScroll } from '@/hooks/useHorizontalScroll'

export interface StopTimebarProps {
  lastUpdated: Date | null
  iettUpdatedAt: string | null
  maxGpsTime: string | null
  timestampMode: 'relative' | 'absolute' | 'both'
  timebarFormat: 'standard' | 'compact' | 'emoji'
  showCurrentTime: boolean
  isKiosk?: boolean
  onShowInfo?: () => void
}

export const StopTimebar = memo(function StopTimebar({
  lastUpdated,
  iettUpdatedAt,
  maxGpsTime,
  timestampMode,
  timebarFormat,
  showCurrentTime,
  isKiosk,
  onShowInfo,
}: StopTimebarProps) {
  const { t } = useTranslation()
  const nowMs = useNowTicker(1000)
  const timebarScrollRef = useHorizontalScroll<HTMLDivElement>()

  const currentTimeClock = useMemo(() => {
    const d = new Date(nowMs)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }, [nowMs])

  const kioskDate = useMemo(() => {
    const d = new Date(nowMs)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
  }, [nowMs])

  const kioskIettTime = useMemo(() => {
    if (!iettUpdatedAt) return '--:--:--'
    const d = new Date(iettUpdatedAt)
    if (isNaN(d.getTime())) return iettUpdatedAt
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }, [iettUpdatedAt])

  const serverTimeDisplay = useMemo(() => {
    if (!iettUpdatedAt) return '--:--:--'
    return formatGpsTimestamp(iettUpdatedAt, timestampMode, t, nowMs, timebarFormat)
  }, [iettUpdatedAt, timestampMode, timebarFormat, t, nowMs])

  const clientTimeDisplay = useMemo(() => {
    return lastUpdated
      ? formatGpsTimestamp(lastUpdated.toISOString(), timestampMode, t, nowMs, timebarFormat)
      : '--:--:--'
  }, [lastUpdated, timestampMode, timebarFormat, t, nowMs])

  const iettTimeDisplay = useMemo(() => {
    if (maxGpsTime) return formatGpsTimestamp(maxGpsTime, timestampMode, t, nowMs, timebarFormat)
    return serverTimeDisplay
  }, [maxGpsTime, serverTimeDisplay, timestampMode, timebarFormat, t, nowMs])

  const isIettStale = useMemo(() => {
    if (iettUpdatedAt) {
      const parsed = new Date(iettUpdatedAt).getTime()
      if (!isNaN(parsed)) return nowMs - parsed > 300_000
    }
    if (lastUpdated) {
      return nowMs - lastUpdated.getTime() > 300_000
    }
    return false
  }, [iettUpdatedAt, lastUpdated, nowMs])

  if (isKiosk) {
    return (
      <div className="text-xs font-mono text-text-primary flex items-center justify-center gap-2 flex-1 py-1 font-semibold select-none">
        <span>{kioskDate}</span>
        <span className="text-text-muted">·</span>
        <span className="text-brand-400 font-bold">{currentTimeClock}</span>
        <span className="text-text-muted">·</span>
        <span>{t('stop.kioskLastUpdate', { time: kioskIettTime, defaultValue: `Son Güncelleme: ${kioskIettTime}` })}</span>
      </div>
    )
  }

  return (
    <div
      ref={timebarScrollRef}
      className="text-[11px] text-text-muted flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap flex-1 mask-linear-fade cursor-grab"
    >
      {showCurrentTime && (
        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-brand-900/40 text-brand-200 border border-brand-500/30">
          🕒 {currentTimeClock}
        </span>
      )}
      {lastUpdated ? (
        <>
          <span className="shrink-0 font-medium">
            {timebarFormat === 'emoji' ? (
              `🔄 ${clientTimeDisplay}`
            ) : timebarFormat === 'compact' ? (
              clientTimeDisplay
            ) : (
              t('stops.lastUpdated', { time: clientTimeDisplay, defaultValue: 'güncelleme: {{time}}' })
            )}
          </span>
          <span
            className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] transition-colors ${
              isIettStale
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'bg-surface-muted text-text-secondary'
            }`}
            title={t('stops.lagTitle', { defaultValue: 'İETT veri gecikmesi' })}
          >
            {timebarFormat === 'emoji' ? (
              `📡 ${iettTimeDisplay}`
            ) : timebarFormat === 'compact' ? (
              iettTimeDisplay
            ) : (
              `iett: ${iettTimeDisplay}`
            )}
          </span>
        </>
      ) : (
        t('common.loading')
      )}
      {onShowInfo && (
        <button
          onClick={onShowInfo}
          aria-label={t('stops.lagExplanationAria', 'Neden iki farklı saat var?')}
          className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-surface-muted text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors"
        >
          i
        </button>
      )}
    </div>
  )
})
