import { useState, useEffect, useRef } from 'react'
import { type Settings, loadSettings, saveSettings } from '@/utils/settings'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { ISTANBUL_BOUNDS, MAP_MIN_ZOOM, MAP_MAX_ZOOM } from '@/utils/mapConstants'
import * as L from 'leaflet'
import { DEFAULT_MOCK_LOCATION } from '@/hooks/useLocationManager'
import LocationConsentModal from '@/components/LocationConsentModal'

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const options: { value: Theme; label: string }[] = [
    { value: 'dark',   label: t('settings.themes.dark', { defaultValue: 'Koyu' }) },
    { value: 'amoled', label: t('settings.themes.amoled', { defaultValue: 'AMOLED' }) },
    { value: 'light',  label: t('settings.themes.light', { defaultValue: 'Açık' }) },
  ]
  return (
    <fieldset style={{ border: 'none', padding: 0 }}>
      <legend id="theme-group-label" style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 8, display: 'block' }}>
        {t('settings.theme', { defaultValue: 'Tema' })}
      </legend>
      <div role="group" aria-labelledby="theme-group-label" style={{ display: 'flex', gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            aria-pressed={theme === opt.value}
            style={{
              flex: 1, padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${theme === opt.value ? 'var(--color-brand)' : 'var(--color-border)'}`,
              background: theme === opt.value ? 'var(--color-brand)' : 'transparent',
              color: theme === opt.value ? '#000' : 'var(--color-text-2)',
              fontWeight: theme === opt.value ? 700 : 500,
              cursor: 'pointer', fontSize: 13,
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function MockLocationPicker({ initialLat, initialLon, onPick }: { initialLat: number, initialLon: number, onPick: (lat: number, lon: number) => void }) {
  const { theme } = useTheme()
  const customIcon = L.divIcon({
    className: '',
    html: `<div style="background:#f97316;border-radius:50%;width:18px;height:18px;border:3px solid #fff;box-shadow:0 0 0 4px rgba(249,115,22,0.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

  function PickerEvents() {
    useMapEvents({
      click(e) {
        onPick(e.latlng.lat, e.latlng.lng)
      }
    })
    return null
  }

  return (
    <div style={{ height: 200, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', zIndex: 0 }}>
      <MapContainer
        center={[initialLat, initialLon]}
        zoom={13}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        maxBounds={ISTANBUL_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={`https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`}
          keepBuffer={2}
          updateWhenIdle={true}
          updateWhenZooming={false}
        />
        <Marker position={[initialLat, initialLon]} icon={customIcon} />
        <PickerEvents />
      </MapContainer>
    </div>
  )
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState(false)
  const { prefs, setNearbySettings, exportPrefs, importPrefs, setMockLocation, setGpsConsent } = useUserPrefs()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [showConsentModal, setShowConsentModal] = useState(false)
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isMounted = useRef(true)

  // Clean up timers on unmount so stale updates don't fire after navigation
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (reloadTimer.current) clearTimeout(reloadTimer.current)
      if (statusTimer.current) clearTimeout(statusTimer.current)
    }
  }, [])

  useEffect(() => {
    saveSettings(settings)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [settings])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await importPrefs(file)
      if (!isMounted.current) return
      setImportStatus('ok')
      reloadTimer.current = setTimeout(() => { window.location.reload() }, 800)
    } catch {
      if (!isMounted.current) return
      setImportStatus('err')
      statusTimer.current = setTimeout(() => setImportStatus('idle'), 2500)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold">{t('nav.settings', { defaultValue: 'Ayarlar' })}</h1>

      <div className="card flex flex-col gap-4">
        <div>
          <label className="text-sm text-text-secondary block mb-1">
            {t('settings.language', { defaultValue: 'Dil / Language' })}
          </label>
          <select
            value={i18n.language}
            onChange={(e) => {
              i18n.changeLanguage(e.target.value)
              document.documentElement.lang = e.target.value
            }}
            className="w-full bg-surface border border-surface-muted rounded-lg
                       px-3 py-2 text-sm text-text-primary
                       focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="tr" className="bg-surface-card">Türkçe</option>
            <option value="en" className="bg-surface-card">English</option>
            <option value="ku" className="bg-surface-card">Kürtçe</option>
          </select>
        </div>

        <ThemeSwitcher />

        <div>
          <label className="text-sm text-text-secondary block mb-1">
            {t('settings.apiBase', { defaultValue: 'iett-middle Sunucu Adresi' })}
          </label>
          <input
            type="url"
            value={settings.apiBase}
            onChange={(e) => setSettings((s) => ({ ...s, apiBase: e.target.value }))}
            placeholder={t('settings.apiBasePlaceholder', { defaultValue: 'https://iett-middle.yourdomain.com (boş = aynı origin)' })}
            className="w-full bg-surface border border-surface-muted rounded-lg
                       px-3 py-2 text-sm text-text-primary placeholder-slate-500
                       focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-text-muted mt-1">
            {t('settings.apiBaseHint', { defaultValue: 'Boş bırakırsanız PWA ile aynı origin kullanılır' })}
          </p>
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1">
            {t('settings.refreshInterval', { defaultValue: 'Yenileme Aralığı (saniye)' })}
          </label>
          <input
            type="number"
            min={5}
            max={300}
            value={settings.refreshInterval}
            onChange={(e) =>
              setSettings((s) => ({ ...s, refreshInterval: Number(e.target.value) }))
            }
            className="w-32 bg-surface border border-surface-muted rounded-lg
                       px-3 py-2 text-sm text-text-primary
                       focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p id="autoLocate-label" className="text-sm text-text-secondary font-medium">{t('settings.autoLocate', { defaultValue: 'Otomatik Konum' })}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {t('settings.autoLocateDesc', { defaultValue: 'Yakın Duraklar açılınca GPS\'le otomatik konumla (yalnızca izin verilmişse)' })}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.autoLocate}
            aria-labelledby="autoLocate-label"
            onClick={() => setSettings((s) => ({ ...s, autoLocate: !s.autoLocate }))}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              settings.autoLocate ? 'bg-brand-600' : 'bg-surface-muted'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                settings.autoLocate ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Nearby Settings */}
        <div className="pt-2 border-t border-surface-muted flex flex-col gap-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">
              {t('settings.nearbyRadius', 'Yakın Duraklar: Arama Yarıçapı (metre)')}
            </label>
            <input
              type="number"
              min={100}
              max={3000}
              step={100}
              value={prefs.nearbyRadius}
              onChange={(e) => setNearbySettings(Number(e.target.value), prefs.nearbyMax)}
              className="w-32 bg-surface border border-surface-muted rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">
              {t('settings.nearbyMaxStops', 'Yakın Duraklar: Maksimum Durak Sayısı')}
            </label>
            <input
              type="number"
              min={5}
              max={50}
              step={1}
              value={prefs.nearbyMax}
              onChange={(e) => setNearbySettings(prefs.nearbyRadius, Number(e.target.value))}
              className="w-32 bg-surface border border-surface-muted rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {saved && (
        <p className="text-sm text-eta-soon text-center">{t('settings.saved', { defaultValue: '✓ Ayarlar kaydedildi' })}</p>
      )}

      {/* Location consent & Mock location */}
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-secondary">{t('settings.gpsAndMock', 'GPS ve Sahte Konum')}</p>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-secondary font-medium">
            {prefs.gpsConsent === 'granted' ? t('settings.gpsConsentGranted', 'Konum İzni: Verildi') : prefs.gpsConsent === 'denied' ? t('settings.gpsConsentDenied', 'Konum İzni: Reddedildi') : t('settings.gpsConsentWaiting', 'Konum İzni: Bekliyor')}
          </p>
          {prefs.gpsConsent !== 'granted' && (
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              {t('settings.gpsMockWarning', 'Eğer gerçek konumunuzu paylaşmak istemiyorsanız, uygulama aşağıdaki sahte konumu kullanır. Haritaya dokunarak konumunuzu değiştirebilirsiniz.')}
            </p>
          )}
        </div>

        {prefs.gpsConsent !== 'granted' && (
          <div className="mt-2 relative z-0">
            <MockLocationPicker
              initialLat={prefs.mockLocation?.[0] ?? DEFAULT_MOCK_LOCATION[0]}
              initialLon={prefs.mockLocation?.[1] ?? DEFAULT_MOCK_LOCATION[1]}
              onPick={(lat, lon) => setMockLocation(lat, lon)}
            />
          </div>
        )}

        {prefs.gpsConsent !== 'granted' ? (
          <button
            onClick={() => setShowConsentModal(true)}
            className="mt-2 shrink-0 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors w-full"
          >
            {t('settings.requestGpsModal', 'Konum İznini İste')}
          </button>
        ) : (
          <button
            onClick={() => {
              setGpsConsent('denied')
              setTimeout(() => window.location.reload(), 100)
            }}
            className="mt-2 shrink-0 py-2.5 rounded-xl text-xs font-semibold bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors w-full"
          >
            {t('settings.revokeGpsModal', 'İzni İptal Et (Sahte Konuma Dön)')}
          </button>
        )}
      </div>

      {showConsentModal && (
        <LocationConsentModal
          onConfirm={() => {
            setGpsConsent('granted')
            setShowConsentModal(false)
            setTimeout(() => window.location.reload(), 100)
          }}
          onDismiss={() => {
            setGpsConsent('denied')
            setShowConsentModal(false)
          }}
        />
      )}

      {/* Data backup */}
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-secondary">{t('settings.dataBackup', { defaultValue: 'Veri Yedekleme' })}</p>
        <button
          onClick={exportPrefs}
          className="flex items-center gap-3 py-2.5 px-3 bg-surface-muted hover:bg-slate-700
                     rounded-xl text-sm text-text-primary transition-colors w-full text-left"
        >
          <span className="text-base">&#x1F4E4;</span> {t('settings.exportData', { defaultValue: 'Ayarları Dışa Aktar' })}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm transition-colors w-full text-left ${
            importStatus === 'ok'  ? 'bg-emerald-900/50 text-emerald-300' :
            importStatus === 'err' ? 'bg-red-900/50 text-red-300' :
            'bg-surface-muted hover:bg-slate-700 text-text-primary'
          }`}
        >
          <span className="text-base">&#x1F4E5;</span>
          {importStatus === 'ok' ? t('settings.importOk', { defaultValue: '✓ İçe aktarıldı' }) : importStatus === 'err' ? t('settings.importErr', { defaultValue: '✗ Geçersiz dosya' }) : t('settings.importData', { defaultValue: 'Ayarları İçe Aktar' })}
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
      </div>

      <div className="card text-xs text-text-muted flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-text-secondary text-sm">{t('settings.about', { defaultValue: 'Hakkında' })}</p>
          <span className="text-text-muted">v{__APP_VERSION__}</span>
        </div>
        <p className="text-text-secondary leading-relaxed">
          {t('settings.aboutDesc', { defaultValue: 'İstanbul otobüs hatlarını gerçek zamanlı takip etmek için açık kaynaklı PWA.' })}
        </p>
        <div className="flex flex-col gap-2">
          <p>{t('settings.dataSource', { defaultValue: 'Veri kaynağı: İETT / İBB açık API' })}</p>
          <p className="text-[10px] text-text-muted border-l-2 border-brand-500/30 pl-2">
            <a href="https://data.ibb.gov.tr/license" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 underline decoration-slate-600 underline-offset-2">
              {t('settings.licenseInfo', { defaultValue: 'Atıf 4.0 Uluslararası (CC BY 4.0) kapsamında lisanslanan kamu sektörü bilgilerini içerir.' })}
            </a>
          </p>
          <p>{t('settings.backendSource', { defaultValue: 'Arka uç: iett-middle (FastAPI)' })}</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center pt-1 border-t border-surface-muted/50">
          <a
            href="https://pcislocked.net/kvkk#iett-pwa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300 transition-colors w-fit underline decoration-brand-500/40 underline-offset-2"
          >
            🔒 {t('settings.privacyPolicy')}
          </a>
          <a
            href="https://github.com/pcislocked/iett-pwa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300 transition-colors w-fit"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
                1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
                1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
                1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}
