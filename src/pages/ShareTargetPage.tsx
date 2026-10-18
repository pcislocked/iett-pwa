import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { parseIettShare } from '@/utils/urlResolver'
import { useTranslation } from 'react-i18next'

export default function ShareTargetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    const rawUrl = params.get('url')
    const rawText = params.get('text')
    const title = params.get('title')

    // If text contains URL or both are present, parseIettShare handles it
    const candidate = rawUrl || rawText || title || ''
    const resolved = parseIettShare(rawText, rawUrl || candidate)

    if (resolved?.kind === 'route') {
      navigate(`/routes/${encodeURIComponent(resolved.code)}`, { replace: true })
    } else if (resolved?.kind === 'stop') {
      navigate(`/stops/${encodeURIComponent(resolved.code)}`, { replace: true })
    } else if (resolved?.kind === 'search') {
      navigate(`/search?q=${encodeURIComponent(resolved.query)}`, { replace: true })
    } else {
      // Fallback to home with replace to avoid history loop
      navigate('/', { replace: true })
    }
  }, [params, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-base text-text-primary">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-text-secondary animate-pulse">
        {t('common.loading', { defaultValue: 'Yönlendiriliyor...' })}
      </p>
    </div>
  )
}
