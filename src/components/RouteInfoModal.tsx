import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/client'

interface Props {
  hatKodu: string
  isOpen: boolean
  onClose: () => void
}

export default function RouteInfoModal({ hatKodu, isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<{ trip_duration_min: number | null; hat_tipi: string | null; tarife: string | null } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let mounted = true
    setLoading(true)
    api.routes.info(hatKodu)
      .then(res => {
        if (mounted) setData(res)
      })
      .catch(() => {
        // Silently fail or log
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [hatKodu, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-surface-muted p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">
            {hatKodu} - {t('routes.info', { defaultValue: 'Hat Bilgisi' })}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-muted text-text-muted transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8 text-brand-500">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        ) : data ? (
          <div className="space-y-4">
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
          </div>
        ) : (
          <div className="py-4 text-center text-text-secondary">
            {t('routes.infoError', { defaultValue: 'Bilgi alinamadi.' })}
          </div>
        )}
      </div>
    </div>
  )
}

