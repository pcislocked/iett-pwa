import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import * as L from 'leaflet'

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

type ViewState =
  | 'booting'
  | 'manual-required'
  | 'manual-submitting'
  | 'loading-data'
  | 'ready'
  | 'error'

const MISSION_LABEL_OVERRIDES: Partial<Record<keyof AracMissionItem, string>> = {
  task_start_time: 'Gorev Baslangic',
  task_end_time: 'Gorev Bitis',
  task_coming_time: 'Gorev Gelis',
  line_code: 'Hat Kodu',
  line_name: 'Hat Adi',
  route_code: 'Rota Kodu',
  route_direction: 'Rota Yon',
  service_no: 'Servis No',
  driver_register_no: 'Sofor Sicil No',
  unread_message: 'Okunmamis Mesaj',
  task_status: 'Gorev Durumu',
  task_status_code: 'Durum Kodu',
  old_line_name: 'Eski Hat Adi',
  superior_name: 'Amir Adi',
  bus_door_number: 'Kapi Kodu',
  last_location_time: 'Son Konum Zamani',
  updated_by: 'Guncelleyen',
  intervention_code: 'Mudahale Kodu',
  updated_time: 'Guncelleme Zamani',
  updated_start_time: 'Guncel Baslangic',
  approximate_start_time: 'Yaklasik Baslangic',
  approximate_end_time: 'Yaklasik Bitis',
  is_active: 'Aktif Mi',
  last_point_order_number: 'Son Nokta Sira No',
  last_stop_passed_code: 'Gecilen Son Durak Kodu',
  last_stop_passed_name: 'Gecilen Son Durak Adi',
  stop_code: 'Durak Kodu',
  stop_name: 'Durak Adi',
  sending_time: 'Gonderim Zamani',
  sending_time_old: 'Eski Gonderim Zamani',
  has_plan_sent: 'Plan Gonderildi Mi',
  delivery_report_time: 'Teslim Rapor Zamani',
  gprs_active: 'GPRS Aktif',
}

const HIDDEN_KEYS = new Set<keyof AracMissionItem>([
  'task_start_time_ms', 'task_end_time_ms', 'task_coming_time_ms',
  'approximate_start_time_ms', 'approximate_end_time_ms',
  'last_location_time_ms', 'updated_time_ms', 'updated_start_time_ms',
  'sending_time_ms', 'sending_time_old_ms', 'delivery_report_time_ms',
  'task_id', 'archive_id', 'vehicle_id', 'line_id', 'route_id',
  'driver_id', 'stop_id', 'justification_id', 'task_type_id', 'created_by',
])

const TECHNICAL_KEYS = new Set<keyof AracMissionItem>([
  'task_id', 'archive_id', 'vehicle_id', 'line_id', 'route_id',
  'driver_id', 'stop_id', 'justification_id', 'task_type_id', 'created_by',
])

const TIME_KEYS = new Set<keyof AracMissionItem>([
  'task_start_time', 'task_end_time', 'task_coming_time',
  'approximate_start_time', 'approximate_end_time',
  'last_location_time', 'updated_time', 'updated_start_time',
  'sending_time', 'sending_time_old', 'delivery_report_time'
])

function missionLabel(key: keyof AracMissionItem): string {
  const override = MISSION_LABEL_OVERRIDES[key]
  if (override) return override
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function boolBadge(value: boolean | null | undefined, t: TFunction) {
  if (value === true) return { text: t('common.yes', { defaultValue: 'Evet' }), className: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50' }
  if (value === false) return { text: t('common.no', { defaultValue: 'Hayir' }), className: 'text-[#888] bg-[#1a1a1a] border-[#333]' }
  return { text: t('common.unknown', { defaultValue: 'Bilinmiyor' }), className: 'text-[#888] bg-[#1a1a1a] border-[#333]' }
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

function formatMissionValue(key: keyof AracMissionItem, value: unknown, t: TFunction): React.ReactNode {
  if (typeof value === 'boolean') {
    return value ? t('common.yes', { defaultValue: 'Evet' }) : t('common.no', { defaultValue: 'Hayir' })
  }
  if (TIME_KEYS.has(key) && typeof value === 'string' && value.trim() !== '') {
    const date = parseIettDate(value)
    if (!isNaN(date.getTime())) {
      const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      return (
        <span className="flex items-center justify-end gap-2">
          <span>{timeStr}</span>
          <span className="text-[10px] text-[#888]">({relativeTime(value, t)})</span>
        </span>
      )
    }
  }
  return String(value)
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

function MissionCard({ mission, index, t }: { mission: AracMissionItem; index: number; t: TFunction }) {
  const [isExpanded, setIsExpanded] = useState(mission.is_active === true)

  // eslint-disable-next-line react-hooks/purity
  const isPast = !mission.is_active && (mission.task_end_time_ms ? mission.task_end_time_ms < Date.now() : index < 0)
  
  const startTime = mission.task_start_time
    ? parseIettDate(mission.task_start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : null

  const isActive = mission.is_active === true

  return (
    <div className={`border-b border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden transition-colors ${isActive ? 'border-l-4 border-l-emerald-500' : 'opacity-80'}`}>
      <button onClick={() => setIsExpanded(!isExpanded)} className={`w-full px-4 py-3 flex items-center gap-3 ${isActive ? 'bg-emerald-950/10' : ''}`}>
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-400' : isPast ? 'bg-[#333]' : 'bg-[#666]'}`} />
        <div className="flex-1 text-left min-w-0">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-text-primary' : 'text-[#888]'}`}>
            {mission.line_code ?? mission.route_code ?? t('arac.missionIndex', { defaultValue: 'Görev {{index}}', index: index + 1 })}
          </p>
          {mission.line_name && (
            <p className={`text-[10px] truncate ${isActive ? 'text-[#888]' : 'text-[#555]'}`}>{mission.line_name}</p>
          )}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end">
          {startTime && <span className={`text-sm font-mono ${isActive ? 'text-text-primary' : 'text-[#888]'}`}>{startTime}</span>}
          <span className="text-[10px] text-[#555]">{mission.task_status_code ?? (isActive ? 'ACTIVE' : 'INACTIVE')}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-2 border-t border-[#1a1a1a] bg-[#080808]">
          {(Object.keys(mission) as (keyof AracMissionItem)[])
            .filter((key) => {
              const value = mission[key]
              return value !== null && value !== undefined && value !== '' && !HIDDEN_KEYS.has(key)
            })
            .map((key) => (
              <div key={key} className="py-2 border-b border-[#1a1a1a] last:border-0 flex items-center justify-between gap-3">
                <span className="text-xs text-[#777]">{missionLabel(key)}</span>
                <span className="text-xs text-text-primary text-right break-all">
                  {formatMissionValue(key, mission[key], t)}
                </span>
              </div>
            ))}
        </div>
      )}
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

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
    const [bus, missionData] = await Promise.all([
      api.arac.bus(kapino, credentials),
      api.arac.missions(kapino, credentials),
    ])
    if (!aliveRef.current) return
    setProfile(bus)
    setMissionsData(missionData)
    setLastFetchTime(Date.now())
    setViewState('ready')
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
      clearAracSession()
    }
    const existing = forceReconnect ? null : loadAracSession()
    if (existing) {
      try {
        await fetchBusData(existing)
        return
      } catch (error) {
        if (!aliveRef.current) return
        if (hasSessionError(error)) {
          clearAracSession()
          setInlineWarning(t('arac.sessionExpired', { defaultValue: 'Oturum süresi doldu. Yeniden captcha akışı başlatılıyor.' }))
        } else {
          setViewState('error')
          setFatalError(errorText(error, t))
          return
        }
      }
    }
    try {
      await fetchCaptcha()
      if (!aliveRef.current) return
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
      })
      const credentials = saveAracSession({
        sessionId: created.sessionId,
        sessionKey: created.sessionKey,
      })
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
  }, [captchaId, manualAnswer, fetchBusData, fetchCaptcha, t])

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
    const missions = missionsData.missions.map(m => {
      const copy = { ...m }
      if (!copy.task_start_time && copy.task_start_time_ms) {
        const d = new Date(copy.task_start_time_ms)
        const yr = d.getFullYear()
        const mo = String(d.getMonth() + 1).padStart(2, '0')
        const da = String(d.getDate()).padStart(2, '0')
        const ho = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        const se = String(d.getSeconds()).padStart(2, '0')
        copy.task_start_time = `${yr}-${mo}-${da} ${ho}:${mi}:${se}`
      }
      if (!copy.task_end_time && copy.task_end_time_ms) {
        const d = new Date(copy.task_end_time_ms)
        const yr = d.getFullYear()
        const mo = String(d.getMonth() + 1).padStart(2, '0')
        const da = String(d.getDate()).padStart(2, '0')
        const ho = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        const se = String(d.getSeconds()).padStart(2, '0')
        copy.task_end_time = `${yr}-${mo}-${da} ${ho}:${mi}:${se}`
      }
      return copy
    })
    missions.sort((a, b) => (a.task_start_time_ms ?? 0) - (b.task_start_time_ms ?? 0))
    return missions
  }, [missionsData])

  const activeMissionsCount = useMemo(() => {
    return sortedMissions.filter(m => m.is_active === true).length
  }, [sortedMissions])

  const technicalDetails = useMemo(() => {
    if (!missionsData || sortedMissions.length === 0) return []
    const referenceMission = sortedMissions.find(m => m.is_active) || sortedMissions[0]
    return Array.from(TECHNICAL_KEYS)
      .map(key => ({ key, value: referenceMission[key] }))
      .filter(item => item.value !== null && item.value !== undefined && item.value !== '')
  }, [sortedMissions, missionsData])

  const busIcon = useMemo(() => makeBusIcon(), [])

  return (
    <div className="fixed inset-0 z-[2200] bg-surface-card flex flex-col">
      <div className="safe-area-pt border-b border-[#111] bg-surface-card px-4 py-3 shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.14em] text-[#666]">{t('arac.fleetDetail', { defaultValue: 'ARAÇ DETAY' })}</p>
          <h1 className="text-base font-semibold text-text-primary truncate">{kapino ? t('arac.busTitle', { defaultValue: 'Araç {{kapino}}', kapino }) : t('arac.busTitleEmpty', { defaultValue: 'Araç Detay' })}</h1>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="metro-tilt text-sm px-3 py-1.5 border border-surface-border text-text-secondary"
        >
          {t('common.close', { defaultValue: 'Kapat' })}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--color-bg)] flex flex-col">
        {(viewState === 'booting' || viewState === 'loading-data' || viewState === 'manual-submitting') && (
          <div className="p-4 flex items-start gap-3">
            <div className="w-4 h-4 mt-1 border-2 border-[#00AFF0] border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm text-text-primary font-medium">
                {viewState === 'manual-submitting'
                  ? t('arac.verifyingCaptcha', { defaultValue: 'Captcha doğrulanıyor...' })
                  : viewState === 'loading-data'
                  ? t('arac.loadingData', { defaultValue: 'Veriler yükleniyor...' })
                  : t('arac.preparingSession', { defaultValue: 'Oturum hazırlanıyor...' })}
              </p>
              <p className="text-xs text-[#888] mt-1">{t('arac.stayOnPage', { defaultValue: 'İşlem tamamlanana kadar sayfada kalabilirsiniz.' })}</p>
            </div>
          </div>
        )}

        {inlineWarning && viewState !== 'ready' && (
          <div className="px-4 py-3 border-b border-amber-700/30 bg-amber-950/20 text-amber-300 text-xs flex items-center gap-3">
            <p className="flex-1 min-w-0">{inlineWarning}</p>
            <button
              onClick={() => { void startFlow(true) }}
              className="metro-tilt px-2.5 py-1 border border-amber-600/40 text-amber-200 shrink-0"
            >
              {t('arac.reconnect', { defaultValue: 'Yeniden Bağlan' })}
            </button>
          </div>
        )}

        {viewState === 'manual-required' && (
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{t('arac.captchaManual', { defaultValue: 'Güvenlik Doğrulaması' })}</h2>
              <p className="text-xs text-[#888] mt-1">{t('arac.captchaInstruction', { defaultValue: 'Oturum açmak için koddaki karakterleri girin.' })}</p>
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
              className="w-full border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#00AFF0]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { void submitManualCaptcha() }}
                className="metro-tilt px-3 py-2 bg-[#00AFF0] text-black text-sm font-semibold"
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
          <div className="p-4 text-red-200 bg-red-950/20 border-b border-red-800/40">
            <p className="text-sm font-semibold">{t('arac.failedToOpen', { defaultValue: 'Bağlantı Hatası' })}</p>
            <p className="text-xs mt-1">{fatalError ?? t('arac.unknownError', { defaultValue: 'Bilinmeyen hata' })}</p>
          </div>
        )}

        {viewState === 'ready' && profile && (
          <>
            <div style={{ height: '33vh', minHeight: '200px' }} className="relative bg-surface-muted/20 shrink-0 border-b border-[#111]">
              <MapContainer 
                center={[profile.latitude ?? 41.0082, profile.longitude ?? 28.9784]} 
                zoom={16} 
                style={{ height: '100%', width: '100%' }} 
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; CartoDB'
                  url={`https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`}
                />
                {profile.latitude && profile.longitude && (
                  <Marker position={[profile.latitude, profile.longitude]} icon={busIcon} />
                )}
              </MapContainer>
            </div>

            <div className="flex flex-col gap-3 p-4">
              {showRefreshButton && (
                <div className="flex items-center justify-between p-3 bg-amber-950/20 border border-amber-800/40 rounded">
                  <p className="text-xs text-amber-300">{t('arac.staleDataWarning', { defaultValue: 'Bu veri eski (5 dakikadan uzun süredir güncellenmedi).' })}</p>
                  <button onClick={() => startFlow(true)} className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded">
                    {t('common.refresh', { defaultValue: 'Yenile' })}
                  </button>
                </div>
              )}

              <div className="border border-[#111] bg-[#0d0d0d] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#1a1a1a]">
                  <div className="flex justify-between items-start gap-2">
                    <h2 className="text-xl font-bold text-text-primary tracking-tight">
                      🚌 {profile.kapino}
                    </h2>
                    {profile.last_seen && (
                      <span className="text-[10px] text-[#888] bg-[#1a1a1a] px-2 py-1 rounded">
                        {t('arac.lastSeen', { defaultValue: 'Son Görülme' })}: {parseIettDate(profile.last_seen).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({relativeTime(profile.last_seen, t)})
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-[#888] mt-1">{profile.plate} &middot; {profile.vehicle_brand} {profile.model_year}</p>
                  <p className="text-xs text-[#666] mt-1">{profile.operator_name} &middot; {profile.garage_name}</p>
                </div>
                <div className="p-3 grid grid-cols-5 gap-2 bg-[#080808]">
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
                {(profile.seating_capacity || profile.full_capacity) && (
                  <div className="px-4 py-2 text-xs text-[#888] text-center bg-[#0d0d0d] border-t border-[#1a1a1a]">
                    {t('arac.capacity', {
                      seating: profile.seating_capacity || '?',
                      total: profile.full_capacity || '?',
                      defaultValue: `Kapasite: ${profile.seating_capacity || '?'} oturma / ${profile.full_capacity || '?'} toplam`
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-end justify-between">
                <h3 className="text-base font-semibold text-text-primary">{t('arac.missions', { defaultValue: 'Görevler' })}</h3>
                {missionsData && (
                  <span className="text-xs text-[#888]">
                    {t('arac.missionsSummary', {
                      count: missionsData.summary.mission_count,
                      active: activeMissionsCount,
                      defaultValue: `${missionsData.summary.mission_count} görev, ${activeMissionsCount} aktif`
                    })}
                  </span>
                )}
              </div>

              {activeMissionsCount > 1 && (
                <div className="px-3 py-2 bg-amber-950/30 border border-amber-800/50 rounded flex items-start gap-2">
                  <span className="text-amber-500">⚠️</span>
                  <p className="text-xs text-amber-200/90 leading-tight">
                    {t('arac.multipleActiveWarning', { defaultValue: 'Sistemde bu araç için birden fazla aktif görev görünüyor. Lütfen tüm listeyi inceleyin.' })}
                  </p>
                </div>
              )}

              <div className="border border-[#111] rounded-lg overflow-hidden">
                {sortedMissions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#888]">{t('arac.noMissions', { defaultValue: 'Görev bulunamadı.' })}</div>
                ) : (
                  sortedMissions.map((mission, index) => (
                    <MissionCard key={mission.task_id ?? index} mission={mission} index={index} t={t} />
                  ))
                )}
              </div>

              {technicalDetails.length > 0 && (
                <div className="mt-4 border border-[#111] bg-[#0d0d0d] rounded-lg overflow-hidden">
                  <button onClick={() => setShowTechnicalDetails(!showTechnicalDetails)} className="w-full px-4 py-3 flex items-center justify-between text-xs text-[#888] font-semibold">
                    <span>▶ {t('arac.technicalDetails', { defaultValue: 'Teknik Detaylar (Sistem ID\'leri)' })}</span>
                  </button>
                  {showTechnicalDetails && (
                    <div className="px-4 py-2 border-t border-[#1a1a1a] bg-[#080808]">
                      <div className="py-2 border-b border-[#1a1a1a] flex items-center justify-between gap-3">
                        <span className="text-xs text-[#555]">{t('arac.operatorId', { defaultValue: 'Operatör ID' })}</span>
                        <span className="text-xs text-[#777]">{profile.operator_id ?? '-'}</span>
                      </div>
                      <div className="py-2 border-b border-[#1a1a1a] flex items-center justify-between gap-3">
                        <span className="text-xs text-[#555]">{t('arac.garageCode', { defaultValue: 'Garaj Kodu' })}</span>
                        <span className="text-xs text-[#777]">{profile.garage_code ?? '-'}</span>
                      </div>
                      <div className="py-2 border-b border-[#1a1a1a] flex items-center justify-between gap-3">
                        <span className="text-xs text-[#555]">{t('arac.softwareVersion', { defaultValue: 'Yazılım Sürümü' })}</span>
                        <span className="text-xs text-[#777]">{profile.vehicle_software_version ?? '-'}</span>
                      </div>
                      {technicalDetails.map(({ key, value }) => (
                        <div key={key} className="py-2 border-b border-[#1a1a1a] last:border-0 flex items-center justify-between gap-3">
                          <span className="text-xs text-[#555]">{missionLabel(key)}</span>
                          <span className="text-xs text-[#777] text-right break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
