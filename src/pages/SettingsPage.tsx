import { useState, useEffect, useRef } from 'react'
import { type Settings, loadSettings, saveSettings } from '@/utils/settings'
import { useUserPrefs } from '@/hooks/useUserPrefs'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState(false)
  const { exportPrefs, importPrefs } = useUserPrefs()
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

      <div className="card text-xs text-slate-500 flex flex-col gap-1">
        <p className="font-semibold text-slate-400">Hakkında</p>
        <p>v{__APP_VERSION__} · İETT Canlı</p>
        <p>Veri kaynağı: İETT / İBB açık API</p>
        <p>Arka uç: iett-middle (FastAPI)</p>
      </div>
    </div>
  )
}
