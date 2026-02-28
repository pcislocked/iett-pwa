import { useEffect, useRef } from 'react'

interface Props {
  onConfirm: () => void
  onDismiss: () => void
}

export default function LocationConsentModal({ onConfirm, onDismiss }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Auto-focus the primary action on mount
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-desc"
        className="bg-surface-card border border-surface-muted rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-xl"
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 bg-brand-600/20 rounded-2xl mx-auto">
          <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 id="consent-title" className="text-base font-bold text-slate-100 mb-1">Konum İzni</h2>
          <p id="consent-desc" className="text-xs text-slate-400 leading-relaxed">
            Yakın durakları listelemek için konumunuza ihtiyaç var. Konumunuz yalnızca
            bu cihazda işlenir; hiçbir sunucuya kaydedilmez.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus:outline-none"
          >
            Konumumu Kullan
          </button>
          <button
            onClick={onDismiss}
            className="w-full bg-surface-muted hover:bg-slate-600 text-slate-300 font-medium py-3 rounded-xl text-sm transition-colors"
          >
            Haritadan Belirt
          </button>
        </div>
      </div>
    </div>
  )
}
