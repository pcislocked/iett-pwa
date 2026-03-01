import { useState, useEffect } from 'react'
import { type Settings, loadSettings, saveSettings } from '@/utils/settings'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    saveSettings(settings)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [settings])

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

      <div className="card text-xs text-slate-500 flex flex-col gap-1">
        <p className="font-semibold text-slate-400">Hakkında</p>
        <p>iett-pwa v0.1.7 · İETT Canlı</p>
        <p>Veri kaynağı: İETT / İBB açık API</p>
        <p>Arka uç: iett-middle (FastAPI)</p>
      </div>
    </div>
  )
}
