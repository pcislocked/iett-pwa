import { useState, useEffect } from 'react'

const STORAGE_KEY = 'iett_settings'

interface Settings {
  apiBase: string
  refreshInterval: number
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Settings
  } catch { /* ignore */ }
  return { apiBase: '', refreshInterval: 20 }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [settings])

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-28 flex flex-col gap-6">
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
      </div>

      {saved && (
        <p className="text-sm text-eta-soon text-center">✓ Ayarlar kaydedildi</p>
      )}

      <div className="card text-xs text-slate-500 flex flex-col gap-1">
        <p className="font-semibold text-slate-400">Hakkında</p>
        <p>iett-pwa v0.1.0 · İETT Canlı</p>
        <p>Veri kaynağı: İETT / İBB açık API</p>
        <p>Arka uç: iett-middle (FastAPI)</p>
      </div>
    </div>
  )
}
