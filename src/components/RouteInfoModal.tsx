import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/client'

interface Props {
  hatKodu: string
  isOpen: boolean
  onClose: () => void
}

export default function RouteInfoModal({ hatKodu, isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<{ trip_duration_min: number | null; hat_tipi: string | null; tarife: string | null; details?: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    let mounted = true
    const controller = new AbortController()
    setLoading(true)
    api.routes.info(hatKodu, { signal: controller.signal })
      .then(res => {
        if (mounted) setData(res)
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
      controller.abort()
    }
  }, [hatKodu, isOpen])

  // Focus restoration & Escape listener & Focus trap
  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement
    closeBtnRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'Tab' && modalRef.current) {
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
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-info-title"
        className="relative bg-surface-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-surface-muted p-5"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="route-info-title" className="text-lg font-bold text-text-primary">
            {hatKodu} - {t('routes.info', { defaultValue: 'Hat Bilgisi' })}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Kapat' })}
            className="p-1 rounded-lg hover:bg-surface-muted text-text-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {loading ? (
          <div className="py-4 text-center text-text-secondary">
            {t('common.loading', { defaultValue: 'Yükleniyor...' })}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {data.details && data.details.length > 0 ? (
              data.details.map((line, idx) => {
                const parts = line.split(':')
                if (parts.length >= 2) {
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{parts[0].trim()}</span>
                      <span className="text-base text-text-primary">{parts.slice(1).join(':').trim()}</span>
                    </div>
                  )
                }
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-base text-text-primary">{line}</span>
                  </div>
                )
              })
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('routes.duration', { defaultValue: 'Sefer Süresi' })}</span>
                  <span className="text-base text-text-primary">{data.trip_duration_min ? `${data.trip_duration_min} ${t('common.minutes', { defaultValue: 'dk' })}` : '-'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('routes.type', { defaultValue: 'Hat Tipi' })}</span>
                  <span className="text-base text-text-primary">{data.hat_tipi || '-'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('routes.tariff', { defaultValue: 'Tarife' })}</span>
                  <span className="text-base text-text-primary">{data.tarife || '-'}</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-text-secondary">
            {t('routes.infoError', { defaultValue: 'Bilgi alınamadı.' })}
          </div>
        )}
      </div>
    </div>
  )

}

