import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Settings, loadSettings, saveSettings } from '@/utils/settings'
import { useUserPrefs } from '@/hooks/useUserPrefs'

const LOCATION_CONSENT_KEY = 'location-consent'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState(false)
  const { exportPrefs, importPrefs } = useUserPrefs()
  const [locationConsent, setLocationConsent] = useState<string | null>(() => {
    try { return localStorage.getItem(LOCATION_CONSENT_KEY) } catch { return null }
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timers on unmount so stale updates don't fire after navigation
  useEffect(() => () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current)
    if (statusTimer.current) clearTimeout(statusTimer.current)
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
      setImportStatus('ok')
      reloadTimer.current = setTimeout(() => { window.location.reload() }, 800)
    } catch {
      setImportStatus('err')
      statusTimer.current = setTimeout(() => setImportStatus('idle'), 2500)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold">Ayarlar</h1>

      <div className="card flex flex-col gap-4">
        <div>
          <label className="text-sm text-slate-400 block mb-1">
            iett-middle Sunucu Adresi
          </label>
          <input
            type="url"
            value={settings.apiBase}
            onChange={(e) => setSettings((s) => ({ ...s, apiBase: e.target.value }))}
            placeholder="https://iett-middle.yourdomain.com (boş = aynı origin)"
            className="w-full bg-surface border border-surface-muted rounded-lg
                       px-3 py-2 text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Boş bırakırsanız PWA ile aynı origin kullanılır
          </p>
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-1">
            Yenileme Aralığı (saniye)
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
                       px-3 py-2 text-sm text-slate-100
                       focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p id="autoLocate-label" className="text-sm text-slate-300 font-medium">Otomatik Konum</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Yakın Duraklar açılınca GPS'le otomatik konumla (yalnızca izin verilmişse)
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
      </div>

      {saved && (
        <p className="text-sm text-eta-soon text-center">✓ Ayarlar kaydedildi</p>
      )}

      {/* Location consent */}
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-400">Konum İzni</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300 font-medium">
              {locationConsent === 'granted' ? 'Konum etkin' : 'Konum devre dışı'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {locationConsent === 'granted'
                ? 'Yakın Duraklar konum kullanıyor'
                : 'Yakın Duraklar ana sayfada gizlenir'}
            </p>
          </div>
          {locationConsent === 'granted' ? (
            <button
              onClick={() => {
                try { localStorage.setItem(LOCATION_CONSENT_KEY, 'dismissed') } catch { /* storage unavailable */ }
                setLocationConsent('dismissed')
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors"
            >
              Konumu İptal Et
            </button>
          ) : (
            <button
              onClick={() => {
                try { localStorage.removeItem(LOCATION_CONSENT_KEY) } catch { /* storage unavailable */ }
                setLocationConsent(null)
                navigate('/')
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600/40 text-brand-400 hover:bg-brand-600/60 transition-colors"
            >
              Konumu Etkinleştir
            </button>
          )}
        </div>
      </div>

      {/* Data backup */}
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-400">Veri Yedekleme</p>
        <button
          onClick={exportPrefs}
          className="flex items-center gap-3 py-2.5 px-3 bg-surface-muted hover:bg-slate-700
                     rounded-xl text-sm text-slate-200 transition-colors w-full text-left"
        >
          <span className="text-base">&#x1F4E4;</span> Ayarları Dışa Aktar
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm transition-colors w-full text-left ${
            importStatus === 'ok'  ? 'bg-emerald-900/50 text-emerald-300' :
            importStatus === 'err' ? 'bg-red-900/50 text-red-300' :
            'bg-surface-muted hover:bg-slate-700 text-slate-200'
          }`}
        >
          <span className="text-base">&#x1F4E5;</span>
          {importStatus === 'ok' ? '✓ İçe aktarıldı' : importStatus === 'err' ? '✗ Geçersiz dosya' : 'Ayarları İçe Aktar'}
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
      </div>

      <div className="card text-xs text-slate-500 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-400 text-sm">Hakkında</p>
          <span className="text-slate-600">v{__APP_VERSION__}</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          İstanbul otobüs ve tramvay hatlarını gerçek zamanlı takip etmek için açık kaynaklı PWA.
        </p>
        <div className="flex flex-col gap-1">
          <p>Veri kaynağı: İETT / İBB açık API</p>
          <p>Arka uç: iett-middle (FastAPI)</p>
        </div>
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
  )
}
