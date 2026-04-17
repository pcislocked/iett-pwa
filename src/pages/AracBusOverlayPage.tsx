import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { clearAracSession, loadAracSession, saveAracSession } from '@/api/aracSession'
import {
  api,
  ApiHttpError,
  type AracMissionItem,
  type AracMissionsResponse,
  type AracSessionCredentials,
  type BusPosition,
} from '@/api/client'

type ViewState =
  | 'booting'
  | 'auto-solving'
  | 'manual-required'
  | 'manual-submitting'
  | 'loading-data'
  | 'ready'
  | 'error'

const AUTO_SOLVE_MAX_ATTEMPTS = 3

const PROFILE_LABELS: Array<{ key: keyof BusPosition; label: string }> = [
  { key: 'plate', label: 'Plaka' },
  { key: 'route_code', label: 'Hat Kodu' },
  { key: 'direction', label: 'Yon' },
  { key: 'vehicle_brand', label: 'Marka' },
  { key: 'model_year', label: 'Model Yili' },
  { key: 'vehicle_type', label: 'Arac Tipi' },
  { key: 'operator_name', label: 'Operator' },
  { key: 'operator_id', label: 'Operator ID' },
  { key: 'garage_name', label: 'Garaj' },
  { key: 'garage_code', label: 'Garaj Kodu' },
  { key: 'seating_capacity', label: 'Oturma Kapasitesi' },
  { key: 'full_capacity', label: 'Toplam Kapasite' },
  { key: 'vehicle_software_version', label: 'Yazilim Surumu' },
  { key: 'last_seen', label: 'Son Gorus' },
]

const MISSION_LABEL_OVERRIDES: Partial<Record<keyof AracMissionItem, string>> = {
  task_id: 'Task ID',
  archive_id: 'Archive ID',
  task_start_time_ms: 'Gorev Baslangic (ms)',
  task_end_time_ms: 'Gorev Bitis (ms)',
  task_coming_time_ms: 'Gorev Gelis (ms)',
  line_code: 'Hat Kodu',
  line_name: 'Hat Adi',
  route_code: 'Rota Kodu',
  route_id: 'Rota ID',
  route_direction: 'Rota Yon',
  service_no: 'Servis No',
  driver_register_no: 'Sofor Sicil No',
  unread_message: 'Okunmamis Mesaj',
  task_status: 'Gorev Durumu',
  task_status_code: 'Durum Kodu',
  old_line_name: 'Eski Hat Adi',
  superior_name: 'Amir Adi',
  bus_door_number: 'Kapi Kodu',
  driver_id: 'Sofor ID',
  vehicle_id: 'Arac ID',
  line_id: 'Hat ID',
  justification_id: 'Gerekce ID',
  last_location_time_ms: 'Son Konum Zamani (ms)',
  updated_by: 'Guncelleyen',
  intervention_code: 'Mudahale Kodu',
  updated_time_ms: 'Guncelleme Zamani (ms)',
  updated_start_time_ms: 'Guncel Baslangic (ms)',
  task_start_time: 'Gorev Baslangic',
  task_end_time: 'Gorev Bitis',
  task_coming_time: 'Gorev Gelis',
  last_location_time: 'Son Konum Zamani',
  updated_time: 'Guncelleme Zamani',
  updated_start_time: 'Guncel Baslangic',
  approximate_start_time_ms: 'Yaklasik Baslangic (ms)',
  approximate_end_time_ms: 'Yaklasik Bitis (ms)',
  approximate_start_time: 'Yaklasik Baslangic',
  approximate_end_time: 'Yaklasik Bitis',
  is_active: 'Aktif Mi',
  last_point_order_number: 'Son Nokta Sira No',
  task_type_id: 'Gorev Tipi ID',
  created_by: 'Olusturan',
  last_stop_passed_code: 'Gecilen Son Durak Kodu',
  last_stop_passed_name: 'Gecilen Son Durak Adi',
  stop_id: 'Durak ID',
  stop_code: 'Durak Kodu',
  stop_name: 'Durak Adi',
  sending_time_ms: 'Gonderim Zamani (ms)',
  sending_time: 'Gonderim Zamani',
  sending_time_old_ms: 'Eski Gonderim Zamani (ms)',
  sending_time_old: 'Eski Gonderim Zamani',
  has_plan_sent: 'Plan Gonderildi Mi',
  delivery_report_time_ms: 'Teslim Rapor Zamani (ms)',
  delivery_report_time: 'Teslim Rapor Zamani',
  gprs_active: 'GPRS Aktif',
}

function missionLabel(key: keyof AracMissionItem): string {
  const override = MISSION_LABEL_OVERRIDES[key]
  if (override) return override
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toCaptchaSrc(imageBase64: string): string {
  if (imageBase64.startsWith('data:image/')) return imageBase64
  return `data:image/png;base64,${imageBase64}`
}

function hasSessionError(error: unknown): boolean {
  return error instanceof ApiHttpError && (error.status === 401 || error.status === 403)
}

function errorText(error: unknown): string {
  if (error instanceof ApiHttpError) {
    return error.responseText || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Bilinmeyen hata'
}

function boolBadge(value: boolean | null | undefined): { text: string; className: string } {
  if (value === true) return { text: 'Var', className: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50' }
  if (value === false) return { text: 'Yok', className: 'text-slate-500 bg-[#080808] border-[#222]' }
  return { text: 'Bilinmiyor', className: 'text-slate-500 bg-[#080808] border-[#222]' }
}

function formatMissionValue(value: AracMissionItem[keyof AracMissionItem]): string {
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayir'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export default function AracBusOverlayPage() {
  const navigate = useNavigate()
  const { kapino } = useParams<{ kapino: string }>()
  const aliveRef = useRef(true)

  const [viewState, setViewState] = useState<ViewState>('booting')
  const [profile, setProfile] = useState<BusPosition | null>(null)
  const [missions, setMissions] = useState<AracMissionsResponse | null>(null)
  const [session, setSession] = useState<AracSessionCredentials | null>(null)

  const [captchaId, setCaptchaId] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [manualAnswer, setManualAnswer] = useState('')
  const [autoAttempt, setAutoAttempt] = useState(0)

  const [inlineWarning, setInlineWarning] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      aliveRef.current = false
    }
  }, [])

  const fetchBusData = useCallback(async (credentials: AracSessionCredentials) => {
    if (!kapino) return

    setViewState('loading-data')
    const [bus, missionData] = await Promise.all([
      api.arac.bus(kapino, credentials),
      api.arac.missions(kapino, credentials),
    ])

    if (!aliveRef.current) return

    setSession(credentials)
    setProfile(bus)
    setMissions(missionData)
    setViewState('ready')
  }, [kapino])

  const fetchCaptcha = useCallback(async () => {
    const challenge = await api.arac.captcha()
    if (!aliveRef.current) return challenge
    setCaptchaId(challenge.captchaId)
    setCaptchaImage(challenge.captchaImageBase64)
    return challenge
  }, [])

  const runAutoSolveFlow = useCallback(async () => {
    setViewState('auto-solving')
    setInlineWarning(null)
    setFatalError(null)

    let lastError = 'Otomatik cozum sonuc vermedi.'

    for (let attempt = 1; attempt <= AUTO_SOLVE_MAX_ATTEMPTS; attempt += 1) {
      if (!aliveRef.current) return

      setAutoAttempt(attempt)
      const challenge = await fetchCaptcha()

      const solved = await api.arac.autoSolve({
        captchaId: challenge.captchaId,
        captchaImageBase64: challenge.captchaImageBase64,
        createSession: true,
        maxCandidates: 8,
      })

      if (solved.solved && solved.sessionId && solved.sessionKey) {
        const credentials = saveAracSession({
          sessionId: solved.sessionId,
          sessionKey: solved.sessionKey,
        })

        if (!aliveRef.current) return
        await fetchBusData(credentials)
        return
      }

      lastError = solved.error ?? lastError
    }

    if (!aliveRef.current) return

    setViewState('manual-required')
    setManualAnswer('')
    setInlineWarning(
      `Otomatik cozum ${AUTO_SOLVE_MAX_ATTEMPTS} denemede basarisiz oldu: ${lastError}`,
    )
  }, [fetchBusData, fetchCaptcha])

  const startFlow = useCallback(async (forceReconnect = false) => {
    if (!kapino) {
      setViewState('error')
      setFatalError('Kapi kodu bulunamadi.')
      return
    }

    setViewState('booting')
    setInlineWarning(null)
    setFatalError(null)
    setAutoAttempt(0)

    if (forceReconnect) {
      clearAracSession()
      setSession(null)
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
          setInlineWarning('ARAC oturumu suresi doldu. Yeniden captcha akisi baslatiliyor.')
        } else {
          setViewState('error')
          setFatalError(errorText(error))
          return
        }
      }
    }

    try {
      await runAutoSolveFlow()
    } catch (error) {
      if (!aliveRef.current) return
      setViewState('error')
      setFatalError(errorText(error))
    }
  }, [fetchBusData, kapino, runAutoSolveFlow])

  useEffect(() => {
    void startFlow()
  }, [startFlow])

  const submitManualCaptcha = useCallback(async () => {
    const answer = manualAnswer.trim()
    if (!answer) {
      setInlineWarning('Lutfen captcha yanitini girin.')
      return
    }
    if (!captchaId) {
      setInlineWarning('Captcha gorseli guncel degil. Yeni captcha alin.')
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
      setInlineWarning(`Captcha dogrulanamadi: ${errorText(error)}`)
      try {
        await fetchCaptcha()
      } catch {
        // Best effort refresh only.
      }
    }
  }, [captchaId, fetchBusData, fetchCaptcha, manualAnswer])

  const profileRows = useMemo(() => {
    if (!profile) return [] as Array<{ label: string; value: string }>

    return PROFILE_LABELS
      .map(({ key, label }) => {
        const value = profile[key]
        if (value === null || value === undefined || value === '') return null
        return { label, value: String(value) }
      })
      .filter((item): item is { label: string; value: string } => item !== null)
  }, [profile])

  const amenities = useMemo(() => {
    if (!profile) return [] as Array<{ label: string; value: boolean | null | undefined }>

    return [
      { label: 'Engelli', value: profile.accessible },
      { label: 'USB', value: profile.has_usb },
      { label: 'Wi-Fi', value: profile.has_wifi },
      { label: 'Bisiklet', value: profile.has_bicycle_rack },
      { label: 'Klima', value: profile.is_air_conditioned },
    ]
  }, [profile])

  return (
    <div className="fixed inset-0 z-[2200] bg-black flex flex-col">
      <div className="safe-area-pt border-b border-[#111] bg-black px-4 py-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#666]">ARAC Filo Detay</p>
            <h1 className="text-base font-semibold text-white truncate">{kapino ? `Arac ${kapino}` : 'Arac Detay'}</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="metro-tilt text-sm px-3 py-1.5 border border-[#222] text-slate-300"
          >
            Kapat
          </button>
        </div>
      </div>

      {inlineWarning && (
        <div className="px-4 py-2 border-b border-amber-700/30 bg-amber-950/20 text-amber-300 text-xs flex items-center gap-3">
          <p className="flex-1 min-w-0">{inlineWarning}</p>
          <button
            onClick={() => { void startFlow(true) }}
            className="metro-tilt px-2.5 py-1 border border-amber-600/40 text-amber-200 shrink-0"
          >
            Yeniden Baglan
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
        {(viewState === 'booting' || viewState === 'auto-solving' || viewState === 'loading-data' || viewState === 'manual-submitting') && (
          <div className="border border-[#111] bg-[#0d0d0d] p-4 flex items-start gap-3">
            <div className="w-4 h-4 mt-1 border-2 border-[#00AFF0] border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm text-white font-medium">
                {viewState === 'auto-solving'
                  ? `Captcha otomatik cozüluyor (${autoAttempt}/${AUTO_SOLVE_MAX_ATTEMPTS})`
                  : viewState === 'manual-submitting'
                  ? 'Captcha dogrulaniyor...'
                  : viewState === 'loading-data'
                  ? 'ARAC veri paketi yukleniyor...'
                  : 'ARAC oturumu hazirlaniyor...'}
              </p>
              <p className="text-xs text-[#888] mt-1">Islem tamamlanana kadar bu sayfada kalabilirsiniz.</p>
            </div>
          </div>
        )}

        {viewState === 'manual-required' && (
          <div className="border border-[#111] bg-[#0d0d0d] p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Captcha manuel dogrulama</h2>
              <p className="text-xs text-[#888] mt-1">Otomatik cozum siniri asildi. Captcha kodunu yazarak devam edin.</p>
            </div>

            {captchaImage && (
              <img
                src={toCaptchaSrc(captchaImage)}
                alt="ARAC captcha"
                className="w-full max-w-[320px] border border-[#222]"
              />
            )}

            <input
              type="text"
              value={manualAnswer}
              onChange={(event) => setManualAnswer(event.target.value.toUpperCase().slice(0, 6))}
              placeholder="Captcha cevabi"
              className="w-full border border-[#222] bg-black px-3 py-2 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#00AFF0]"
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { void submitManualCaptcha() }}
                className="metro-tilt px-3 py-2 bg-[#00AFF0] text-black text-sm font-semibold"
              >
                Oturumu Ac
              </button>
              <button
                onClick={() => { void fetchCaptcha() }}
                className="metro-tilt px-3 py-2 border border-[#222] text-slate-200 text-sm"
              >
                Yeni Captcha
              </button>
              <button
                onClick={() => { void runAutoSolveFlow() }}
                className="metro-tilt px-3 py-2 border border-[#222] text-slate-200 text-sm"
              >
                Tekrar Oto Coz ({AUTO_SOLVE_MAX_ATTEMPTS})
              </button>
            </div>
          </div>
        )}

        {(viewState === 'error' || fatalError) && (
          <div className="border border-red-800/40 bg-red-950/20 p-4 text-red-200">
            <p className="text-sm font-semibold">ARAC detay acilamadi</p>
            <p className="text-xs mt-1">{fatalError ?? 'Bilinmeyen hata'}</p>
          </div>
        )}

        {viewState === 'ready' && profile && missions && (
          <div className="space-y-4">
            <section className="border border-[#111] bg-[#0d0d0d]">
              <div className="px-4 py-3 border-b border-[#111] flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Arac Profili / Vehicle Profile</h2>
                {session && <span className="text-[10px] text-emerald-400">Session hazir</span>}
              </div>

              <div className="px-4 py-3 border-b border-[#111] flex flex-wrap gap-2">
                {amenities.map((item) => {
                  const badge = boolBadge(item.value)
                  return (
                    <span
                      key={item.label}
                      className={`text-[10px] px-2 py-1 border ${badge.className}`}
                    >
                      {item.label}: {badge.text}
                    </span>
                  )
                })}
              </div>

              <div>
                {profileRows.length > 0 ? (
                  profileRows.map((row) => (
                    <div key={row.label} className="px-4 py-2.5 border-b border-[#111] flex items-center justify-between gap-3">
                      <span className="text-xs text-[#888]">{row.label}</span>
                      <span className="text-xs text-white text-right break-all">{row.value}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-3 text-xs text-[#888]">Profil alanlari su an bos dondu.</p>
                )}
              </div>
            </section>

            <section className="border border-[#111] bg-[#0d0d0d]">
              <div className="px-4 py-3 border-b border-[#111]">
                <h2 className="text-sm font-semibold text-white">Missions / Gorevler</h2>
                <p className="text-xs text-[#888] mt-1">
                  Toplam {missions.summary.mission_count} gorev, aktif {missions.summary.active_count}
                </p>
              </div>

              {missions.missions.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[#888]">Bu araca ait gorev bulunamadi.</p>
              ) : (
                <div>
                  {missions.missions.map((mission, index) => (
                    <article key={`${mission.task_id ?? index}-${index}`} className="border-b border-[#111]">
                      <div className="px-4 py-3 border-b border-[#111] bg-black/30">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-white">
                            {mission.line_code ?? mission.route_code ?? `Gorev ${index + 1}`}
                          </p>
                          <p className="text-[10px] text-[#888]">
                            {mission.task_status_code ?? (mission.is_active ? 'ACTIVE' : 'INACTIVE')}
                          </p>
                        </div>
                      </div>

                      <div>
                        {(Object.keys(mission) as (keyof AracMissionItem)[])
                          .filter((key) => {
                            const value = mission[key]
                            return value !== null && value !== undefined && value !== ''
                          })
                          .map((key) => (
                            <div key={key} className="px-4 py-2.5 border-b border-[#111] flex items-center justify-between gap-3">
                              <span className="text-xs text-[#777]">{missionLabel(key)}</span>
                              <span className="text-xs text-white text-right break-all">
                                {formatMissionValue(mission[key])}
                              </span>
                            </div>
                          ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
