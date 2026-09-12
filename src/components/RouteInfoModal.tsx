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
  const [data, setData] = useState<{ trip_duration_min: number | null; hat_tipi: string | null; tarife: string | null; details?: string[] } | null>(null)
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

