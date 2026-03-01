import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPrefs } from '@/hooks/useUserPrefs'

interface MenuSheetProps {
  onClose: () => void
}

/**
 * Hamburger ≡ bottom sheet — global app menu.
 * Shown from BottomTabBar when the menu tab is pressed.
 */
export default function MenuSheet({ onClose }: MenuSheetProps) {
  const navigate = useNavigate()
  const { exportPrefs, importPrefs } = useUserPrefs()
  const fileRef = useRef<HTMLInputElement>(null)

  // Close on backdrop tap / Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function go(path: string) {
    onClose()
    navigate(path)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const file = input.files?.[0]
    if (!file) {
      input.value = ''
      return
    }
    try {
      await importPrefs(file)
      onClose()
      window.location.reload()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      input.value = ''
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card rounded-t-2xl
                      border-t border-surface-border pb-safe-area-inset-bottom">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-muted" />
        </div>

        <div className="px-4 py-2 divide-y divide-surface-muted">

          <MenuRow icon="⭐" label="Favoriler"         onPress={() => go('/favorites')} />
          <MenuRow icon="🗺"  label="Filo Haritası"    onPress={() => go('/map')} />
          <MenuRow icon="⚙"  label="Ayarlar"           onPress={() => go('/settings')} />

          <div className="py-1" />

          <MenuRow
            icon="📤"
            label="Veriyi Dışa Aktar"
            onPress={() => { exportPrefs(); onClose() }}
          />
          <MenuRow
            icon="📥"
            label="Veriyi İçe Aktar"
            onPress={() => fileRef.current?.click()}
          />

          <div className="py-1" />

          <MenuRow
            icon="🐱"
            label="GitHub"
            onPress={() => {
              window.open('https://github.com/pcislocked/iett-pwa', '_blank', 'noopener,noreferrer')
              onClose()
            }}
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />

        <div className="h-4" />
      </div>
    </>
  )
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: string
  label: string
  onPress: () => void
}) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 py-3 text-left
                 text-slate-200 hover:text-white active:opacity-70 transition-opacity"
    >
      <span className="text-lg w-7 text-center">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
