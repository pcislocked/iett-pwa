import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--color-bg)]">
      <div className="flex items-center h-14 shrink-0 px-2 border-b border-surface-border">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="p-3 text-text-primary active:bg-surface-active rounded-full"
          aria-label={t('common.home', { defaultValue: 'Ana Sayfa' })}
        >
          <span className="text-xl">??</span>
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-1">404</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">??</span>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          {t('common.notFoundTitle', { defaultValue: 'Sayfa Bulunamadi' })}
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          {t('common.notFoundDesc', { defaultValue: 'Aradiginiz sayfa, durak veya hat bulunamadi. Lütfen bilgileri kontrol edin.' })}
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-6 py-3 bg-brand-primary text-white rounded-xl font-medium active:opacity-80 transition-opacity"
        >
          {t('common.goHome', { defaultValue: 'Ana Sayfaya Dön' })}
        </button>
      </div>
    </div>
  )
}
