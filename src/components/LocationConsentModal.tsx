import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface Props {
  onConfirm: () => void
  onDismiss: () => void
}

export default function LocationConsentModal({ onConfirm, onDismiss }: Props) {
  const { t } = useTranslation()
  const confirmRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<Element | null>(null)
  const [deniedState, setDeniedState] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    previouslyFocused.current = document.activeElement
    confirmRef.current?.focus()
    return () => {
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus()
      }
    }
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onDismiss()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
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
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="bg-surface-card border border-surface-muted rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-xl"
      >
        {!deniedState ? (
          <>
            <div className="flex items-center justify-center w-12 h-12 bg-brand-600/20 rounded-2xl mx-auto">
              <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 id="consent-title" className="text-base font-bold text-text-primary mb-1">{t('nearby.locationPermission', { defaultValue: 'Konum İzni' })}</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('nearby.locationPermissionDesc', { defaultValue: 'Yakın durakları listelemek için konumunuza ihtiyaç var. Konumunuz yalnızca en yakın durakları bulmak amacıyla sunucuya iletilir; veritabanında saklanmaz.' })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                ref={confirmRef}
                disabled={isLocating}
                onClick={() => {
                  if (!navigator.geolocation) {
                    setDeniedState(true)
                    return
                  }
                  setIsLocating(true)
                  navigator.geolocation.getCurrentPosition(
                    () => {
                      setIsLocating(false)
                      onConfirm()
                    },
                    () => {
                      setIsLocating(false)
                      setDeniedState(true)
                    },
                    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                  )
                }}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-70 text-white font-semibold py-3 rounded-xl text-sm transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus:outline-none flex items-center justify-center gap-2"
              >
                {isLocating && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {isLocating ? t('nearby.waitingPermission', { defaultValue: 'İzin Bekleniyor...' }) : t('nearby.useGps', { defaultValue: 'Konumumu Kullan' })}
              </button>
              <button
                onClick={() => setDeniedState(true)}
                disabled={isLocating}
                className="w-full bg-surface-muted hover:bg-slate-600 disabled:opacity-50 text-text-secondary font-medium py-3 rounded-xl text-sm transition-colors"
              >
                {t('nearby.denyPermission', { defaultValue: 'İzin Verme' })}
              </button>
              <a
                href="https://pcislocked.net/kvkk#iett-pwa"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center text-xs text-text-muted hover:text-brand-400 underline decoration-slate-600 underline-offset-2 transition-colors pt-1"
              >
                {t('settings.privacyPolicy', { defaultValue: 'Gizlilik Politikası' })}
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 bg-amber-600/20 rounded-2xl mx-auto">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 id="consent-title" className="text-base font-bold text-text-primary mb-1">{t('nearby.mockLocationTitle', { defaultValue: 'Sahte Konum Kullanılacak' })}</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('nearby.mockLocationDesc', { defaultValue: 'GPS izni vermediğiniz için uygulama varsayılan sahte bir konumla çalışacak. Bu sahte konumu daha sonra Ayarlar menüsünden harita üzerinden değiştirebilirsiniz.' })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onDismiss}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus:outline-none"
              >
                {t('common.gotIt', { defaultValue: 'Anladım' })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
