import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import * as L from 'leaflet'

import { ISTANBUL_BOUNDS, MAP_MIN_ZOOM, MAP_MAX_ZOOM } from '@/utils/mapConstants'
import { clearAracSession, loadAracSession, saveAracSession } from '@/api/aracSession'
import {
  api,
  ApiHttpError,
  type AracMissionItem,
  type AracMissionsResponse,
  type AracSessionCredentials,
  type BusPosition,
} from '@/api/client'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { useTheme } from '@/hooks/useTheme'
import PullToRefresh from '@/components/PullToRefresh'

type ViewState =
  | 'booting'
  | 'manual-required'
  | 'manual-submitting'
  | 'loading-data'
  | 'ready'
  | 'error'



function boolBadge(value: boolean | null | undefined, t: TFunction) {
  if (value === true) return { text: t('common.yes', { defaultValue: 'Evet' }), className: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 dark:border-emerald-800/50' }
  if (value === false) return { text: t('common.no', { defaultValue: 'Hayır' }), className: 'text-text-secondary bg-surface-muted border-surface-border' }
  return { text: t('common.unknown', { defaultValue: 'Bilinmiyor' }), className: 'text-text-secondary bg-surface-muted border-surface-border' }
}

function errorText(error: unknown, t: TFunction): string {
  if (error instanceof ApiHttpError) {
    return error.responseText || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return t('arac.unknownError', { defaultValue: 'Bilinmeyen hata' })
}

function hasSessionError(error: unknown): boolean {
  return error instanceof ApiHttpError && (error.status === 401 || error.status === 403)
}

function toCaptchaSrc(base64: string): string {
  if (base64.startsWith('data:image')) return base64
  return `data:image/jpeg;base64,${base64}`
}

function parseIettDate(dateString: string | null | undefined): Date {
  if (!dateString) return new Date(NaN)
  const d = new Date(dateString)
  if (!isNaN(d.getTime())) return d

  const match = dateString.match(/(\d{2})[\.\-](\d{2})[\.\-](\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/)
  if (match) {
    const [, day, month, year, time] = match
    const iso = `${year}-${month}-${day}${time ? 'T' + time : ''}`
    return new Date(iso)
  }
  return new Date(NaN)
}

function relativeTime(isoString: string, t: TFunction): string {
  const diffMs = Date.now() - parseIettDate(isoString).getTime()
  const diffMinutes = Math.floor(Math.abs(diffMs) / 60000)
  const isPast = diffMs > 0

  let formatted: string
  if (diffMinutes <= 99) {
    formatted = `${diffMinutes} ${t('common.min', { defaultValue: 'dk' })}`
  } else {
    const diffHours = Math.floor(diffMinutes / 60)
    formatted = `${diffHours} ${t('arac.hour', { defaultValue: 'sa' })}`
  }

  return isPast
    ? t('arac.relativeAgo', { value: formatted, defaultValue: '{{value}} önce' })
    : t('arac.relativeIn', { value: formatted, defaultValue: '{{value}} sonra' })
}



function makeBusIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:var(--color-warning);border-radius:50%;
      width:14px;height:14px;
      border:2px solid var(--color-bg);
      box-shadow:0 1px 4px rgba(0,0,0,0.6);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function MissionCard({ mission, t }: { mission: AracMissionItem; index?: number; t: TFunction }) {
  const isCompleted = mission.state === 'T'
  const isPending = mission.state === 'B'

  return (
    <div className={`border-b border-surface-border bg-surface-card px-4 py-3 flex items-center gap-3 ${isPending ? 'border-l-4 border-l-emerald-500' : ''}`}>
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPending ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-surface-border'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isPending ? 'text-text-primary' : 'text-text-secondary'}`}>
          {mission.line_code ?? '—'}
        </p>
        <p className="text-xs text-text-secondary truncate">{mission.first_stop ?? ''}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono text-text-primary">{mission.departure_time ?? '—'}</p>
        <p className={`text-[10px] font-semibold ${isPending ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-secondary opacity-60'}`}>
          {isCompleted ? t('arac.completed', { defaultValue: 'Tamamlandı' }) : isPending ? t('arac.pending', { defaultValue: 'Bekliyor' }) : '—'}
        </p>
      </div>
    </div>
  )
}

export default function AracBusOverlayPage() {
  const { kapino } = useParams<{ kapino: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()

  const [viewState, setViewState] = useState<ViewState>('booting')
  const [captchaImage, setCaptchaImage] = useState<string | null>(null)
  const [captchaId, setCaptchaId] = useState<string | null>(null)
  const [manualAnswer, setManualAnswer] = useState('')
  const [profile, setProfile] = useState<BusPosition | null>(null)
  const [missionsData, setMissionsData] = useState<AracMissionsResponse | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [inlineWarning, setInlineWarning] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)
  const [showRefreshButton, setShowRefreshButton] = useState(false)


  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!lastFetchTime || viewState !== 'ready') {
      setShowRefreshButton(false)
      return
    }
    const interval = setInterval(() => {
      if (Date.now() - lastFetchTime > 5 * 60 * 1000) {
        setShowRefreshButton(true)
      } else {
        setShowRefreshButton(false)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [lastFetchTime, viewState])

  const fetchCaptcha = useCallback(async () => {
    const challenge = await api.arac.captcha()
    if (!aliveRef.current) return challenge
    setCaptchaId(challenge.captchaId)
    setCaptchaImage(challenge.captchaImageBase64)
    return challenge
  }, [])

  const fetchBusData = useCallback(async (credentials: AracSessionCredentials) => {
    if (!kapino) return
    setViewState('loading-data')
    try {
      const { profile: busProfile, missions } = await api.arac.detail(kapino, credentials)
      if (!aliveRef.current) return
      setProfile(busProfile)
      setMissionsData(missions)
      setLastFetchTime(Date.now())
      setInlineWarning(null)
      setViewState('ready')
    } catch (err) {
      throw err // handled by startFlow or submitManualCaptcha
    }
  }, [kapino])

  const startFlow = useCallback(async (forceReconnect = false) => {
    if (!kapino) {
      setViewState('error')
      setFatalError(t('arac.doorCodeMissing', { defaultValue: 'Kapı kodu bulunamadı.' }))
      return
    }
    setViewState('booting')
    setInlineWarning(null)
    if (forceReconnect) {
      clearAracSession(kapino)
    }
    const existing = forceReconnect ? null : loadAracSession(kapino)
    if (existing && existing.sessionId === kapino) {
      try {
        await fetchBusData(existing)
        return
      } catch (error) {
        if (!aliveRef.current) return
        if (hasSessionError(error)) {
          clearAracSession(kapino)
          setInlineWarning(t('arac.sessionExpired', { defaultValue: 'Oturum süresi doldu. Yeniden captcha akışı başlatılıyor.' }))
        } else {
          setViewState('error')
          setFatalError(errorText(error, t))
          return
        }
      }
    }
    
    // Fallback if no valid session: fetch captcha and auto-submit if possible
    try {
      const challenge = await fetchCaptcha()
      if (!aliveRef.current) return
      
      if (challenge.suggestedAnswer) {
        setViewState('manual-submitting') // Show loading while auto-submitting
        // Auto-submit dene (max 2 kez)
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const currentChallenge = attempt === 0
              ? challenge
              : await fetchCaptcha() // 2. denemede yeni captcha al
      
            if (!aliveRef.current) return
            const answer = currentChallenge.suggestedAnswer
            if (!answer) break // OCR başarısız, manual'e düş
      
            const created = await api.arac.createSession({
              captchaId: currentChallenge.captchaId,
              captchaAnswer: answer,
              kapino,
            })
            const credentials = saveAracSession({
              sessionId: created.sessionId,
              sessionKey: created.sessionKey,
            }, kapino)
            if (!aliveRef.current) return
            await fetchBusData(credentials)
            return // Başarılı, çık
          } catch {
            // Devam et, bir sonraki denemeye geç
          }
        }
        if (!aliveRef.current) return
        setInlineWarning(t('arac.autoCaptchaFailed', { defaultValue: 'Otomatik doğrulama başarısız oldu, lütfen manuel girin.' }))
      }
      
      setManualAnswer('')
      setViewState('manual-required')
    } catch (error) {
      if (!aliveRef.current) return
      setViewState('error')
      setFatalError(errorText(error, t))
    }
  }, [fetchBusData, fetchCaptcha, kapino, t])

  const flowStartedRef = useRef(false)

  useEffect(() => {
    if (flowStartedRef.current) return
    flowStartedRef.current = true
    void startFlow()
  }, [startFlow])

  const handlePullRefresh = useCallback(async () => {
    await startFlow()
  }, [startFlow])

  const submitManualCaptcha = useCallback(async () => {
    const answer = manualAnswer.trim()
    if (!answer) {
      setInlineWarning(t('arac.enterCaptcha', { defaultValue: 'Lütfen captcha yanıtını girin.' }))
      return
    }
    if (!captchaId) {
      setInlineWarning(t('arac.captchaStale', { defaultValue: 'Captcha görseli güncel değil. Yeni captcha alın.' }))
      return
    }
    setViewState('manual-submitting')
    setInlineWarning(null)
    try {
      const created = await api.arac.createSession({
        captchaId,
        captchaAnswer: answer,
        kapino: kapino!,
      })
      const credentials = saveAracSession({
        sessionId: created.sessionId,
        sessionKey: created.sessionKey,
      }, kapino!)
      if (!aliveRef.current) return
      await fetchBusData(credentials)
    } catch (error) {
      if (!aliveRef.current) return
      setViewState('manual-required')
      setInlineWarning(t('arac.captchaFailed', { defaultValue: 'Captcha doğrulanamadı: {{error}}', error: errorText(error, t) }))
      try {
        await fetchCaptcha()
      } catch (captchaErr) {
        if (!aliveRef.current) return
        setViewState('error')
        setFatalError(errorText(captchaErr, t))
      }
    }
  }, [captchaId, manualAnswer, fetchBusData, fetchCaptcha, kapino, t])

  const amenities = useMemo(() => {
    if (!profile) return []
    return [
      { label: t('arac.accessible', { defaultValue: 'Engelli' }), icon: '♿', value: profile.accessible },
      { label: t('arac.usb', { defaultValue: 'USB' }), icon: '🔌', value: profile.has_usb },
      { label: t('arac.wifi', { defaultValue: 'Wi-Fi' }), icon: '🛜', value: profile.has_wifi },
      { label: t('arac.bicycle', { defaultValue: 'Bisiklet' }), icon: '🚲', value: profile.has_bicycle_rack },
      { label: t('arac.airConditioned', { defaultValue: 'Klima' }), icon: '❄️', value: profile.is_air_conditioned },
    ]
  }, [profile, t])

  const sortedMissions = useMemo(() => {
    if (!missionsData) return []
    return [...missionsData.missions].sort((a, b) => {
      if (!a.departure_time || !b.departure_time) return 0
      return a.departure_time.localeCompare(b.departure_time)
    })
  }, [missionsData])

  const busIcon = useMemo(() => makeBusIcon(), [])

  return (
    <div className="fixed inset-0 z-[2200] bg-surface-card flex flex-col">
      <div className="safe-area-pt border-b border-surface-border bg-surface-card px-4 py-3 shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.14em] text-text-secondary uppercase">{t('arac.fleetDetail', { defaultValue: 'ARAÇ DETAY' })}</p>
          <h1 className="text-base font-semibold text-text-primary truncate">{kapino ? t('arac.busTitle', { defaultValue: 'Araç {{kapino}}', kapino }) : t('arac.busTitleEmpty', { defaultValue: 'Araç Detay' })}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void startFlow()}
            disabled={viewState === 'booting' || viewState === 'loading-data' || viewState === 'manual-submitting'}
            className="metro-tilt text-sm px-2.5 py-1.5 border border-surface-border text-text-secondary disabled:opacity-50 flex items-center gap-1.5 hover:bg-surface-muted transition-colors"
            title={t('arac.forceRefresh', { defaultValue: 'Yenile' })}
            aria-label={t('arac.forceRefresh', { defaultValue: 'Yenile' })}
          >
            <svg
              className={`w-4 h-4 ${(viewState === 'booting' || viewState === 'loading-data' || viewState === 'manual-submitting') ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">{t('arac.forceRefresh', { defaultValue: 'Yenile' })}</span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="metro-tilt text-sm px-3 py-1.5 border border-surface-border text-text-secondary"
          >
            {t('common.close', { defaultValue: 'Kapat' })}
          </button>
        </div>
      </div>

      <PullToRefresh onRefresh={handlePullRefresh}>
        <div className="flex-1 overflow-y-auto bg-[var(--color-bg)] flex flex-col min-h-full">
        {(viewState === 'booting' || viewState === 'loading-data' || viewState === 'manual-submitting') && (
          <div className="p-4 flex items-start gap-3">
            <div className="w-4 h-4 mt-1 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm text-text-primary font-medium">
                {viewState === 'manual-submitting'
                  ? t('arac.verifyingCaptcha', { defaultValue: 'Captcha doğrulanıyor...' })
                  : viewState === 'loading-data'
                  ? t('arac.loadingData', { defaultValue: 'Veriler yükleniyor...' })
                  : t('arac.preparingSession', { defaultValue: 'Oturum hazırlanıyor...' })}
              </p>
              <p className="text-xs text-text-secondary mt-1">{t('arac.stayOnPage', { defaultValue: 'İşlem tamamlanana kadar sayfada kalabilirsiniz.' })}</p>
            </div>
          </div>
        )}

        {inlineWarning && viewState !== 'ready' && (
          <div className="px-4 py-3 border-b border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-3">
            <p className="flex-1 min-w-0">{inlineWarning}</p>
            <button
              onClick={() => { void startFlow(true) }}
              className="metro-tilt px-2.5 py-1 border border-amber-500/40 text-amber-700 dark:text-amber-200 shrink-0"
            >
              {t('arac.reconnect', { defaultValue: 'Yeniden Bağlan' })}
            </button>
          </div>
        )}

        {viewState === 'manual-required' && (
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{t('arac.captchaManual', { defaultValue: 'Güvenlik Doğrulaması' })}</h2>
              <p className="text-xs text-text-secondary mt-1">{t('arac.captchaInstruction', { defaultValue: 'Oturum açmak için koddaki karakterleri girin.' })}</p>
            </div>
            {captchaImage && (
              <img
                src={toCaptchaSrc(captchaImage)}
                alt="captcha"
                className="w-full max-w-[320px] border border-surface-border"
              />
            )}
            <input
              type="text"
              value={manualAnswer}
              onChange={(event) => setManualAnswer(event.target.value.toUpperCase().slice(0, 6))}
              placeholder={t('arac.captchaAnswer', { defaultValue: 'Captcha cevabı' })}
              aria-label={t('arac.captchaAnswer', { defaultValue: 'Captcha cevabı' })}
              className="w-full border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { void submitManualCaptcha() }}
                className="metro-tilt px-3 py-2 bg-primary text-text-on-primary text-sm font-semibold"
              >
                {t('arac.login', { defaultValue: 'Oturumu Aç' })}
              </button>
              <button
                onClick={() => { void fetchCaptcha() }}
                className="metro-tilt px-3 py-2 border border-surface-border text-text-primary text-sm"
              >
                {t('arac.newCaptcha', { defaultValue: 'Yenile' })}
              </button>
            </div>
          </div>
        )}

        {(viewState === 'error' || fatalError) && (
          <div className="p-4 text-red-600 dark:text-red-200 bg-red-500/10 dark:bg-red-950/20 border-b border-red-500/30 dark:border-red-800/40">
            <p className="text-sm font-semibold">{t('arac.failedToOpen', { defaultValue: 'Bağlantı Hatası' })}</p>
            <p className="text-xs mt-1">{fatalError ?? t('arac.unknownError', { defaultValue: 'Bilinmeyen hata' })}</p>
          </div>
        )}

        {viewState === 'ready' && profile && (
          <>
            <div style={{ height: '33vh', minHeight: '200px' }} className="relative bg-surface-muted/20 shrink-0 border-b border-surface-border">
              <MapContainer
                center={[profile.latitude ?? 41.0082, profile.longitude ?? 28.9784]}
                zoom={16}
                minZoom={MAP_MIN_ZOOM}
                maxZoom={MAP_MAX_ZOOM}
                maxBounds={ISTANBUL_BOUNDS}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; CartoDB'
                  url={`https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`}
                  keepBuffer={2}
                  updateWhenIdle={true}
                  updateWhenZooming={false}
                />
                {profile.latitude && profile.longitude && (
                  <Marker position={[profile.latitude, profile.longitude]} icon={busIcon} />
                )}
              </MapContainer>
            </div>

            <div className="flex flex-col gap-3 p-4">
              {showRefreshButton && (
                <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                  <p className="text-xs text-amber-700 dark:text-amber-300">{t('arac.staleDataWarning', { defaultValue: 'Bu veri eski (5 dakikadan uzun süredir güncellenmedi).' })}</p>
                  <button onClick={() => startFlow(true)} className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded">
                    {t('common.refresh', { defaultValue: 'Yenile' })}
                  </button>
                </div>
              )}

              <div className="border border-surface-border bg-surface-card rounded-lg overflow-hidden">
                <div className="p-4 border-b border-surface-border">
                  <div className="flex justify-between items-start gap-2">
                    <h2 className="text-xl font-bold text-text-primary tracking-tight">
                      🚌 {profile.kapino}
                    </h2>
                    {profile.last_seen && (
                      <span className="text-[10px] text-text-secondary bg-surface-muted px-2 py-1 rounded border border-surface-border">
                        {t('arac.lastSeen', { defaultValue: 'Son Görülme' })}: {parseIettDate(profile.last_seen).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({relativeTime(profile.last_seen, t)})
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-text-secondary mt-1">{profile.plate}</p>
                  <p className="text-xs text-text-secondary opacity-75 mt-1">{profile.operator_name}</p>
                </div>
                <div className="p-3 grid grid-cols-5 gap-2 bg-surface-muted/30">
                  {amenities.map(item => {
                    const badge = boolBadge(item.value, t)
                    return (
                      <div key={item.label} className={`flex flex-col items-center justify-center p-2 rounded border ${badge.className}`}>
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-[9px] mt-1 font-semibold uppercase">{badge.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <h3 className="text-base font-semibold text-text-primary">{t('arac.missions', { defaultValue: 'Görevler' })}</h3>
                {missionsData && (
                  <span className="text-xs text-text-secondary">
                    {t('arac.missionsSummary', {
                      count: missionsData.summary.mission_count,
                      completed: missionsData.summary.completed_count,
                      defaultValue: `${missionsData.summary.mission_count} sefer, ${missionsData.summary.completed_count} tamamlandı`
                    })}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-text-secondary bg-surface-muted/60 px-3 py-2 rounded border border-surface-border">
                ℹ️ {t('arac.futureMissionsNotice', { defaultValue: 'İETT sistem değişiklikleri sebebiyle gelecek sefer bilgisi sunulmamaktadır.' })}
              </p>

              <div className="border border-surface-border rounded-lg overflow-hidden">
                {sortedMissions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-text-secondary">{t('arac.noMissions', { defaultValue: 'Görev bulunamadı.' })}</div>
                ) : (
                  sortedMissions.map((mission, index) => (
                    <MissionCard key={index} mission={mission} index={index} t={t} />
                  ))
                )}
              </div>


            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  </div>
)
}
