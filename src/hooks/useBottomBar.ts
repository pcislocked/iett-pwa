import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BottomBarTab {
  label: string
  icon: React.ReactNode
  onPress: () => void
  active?: boolean
}

interface BottomBarCtx {
  customTabs: BottomBarTab[] | null
  setCustomTabs: (tabs: BottomBarTab[] | null) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const BottomBarContext = createContext<BottomBarCtx>({
  customTabs: null,
  setCustomTabs: () => {},
})

export function useBottomBarContext() {
  return useContext(BottomBarContext)
}

// ---------------------------------------------------------------------------
// Provider state hook (used in App.tsx to create the provider value)
// ---------------------------------------------------------------------------

export function useBottomBarState() {
  const [customTabs, setCustomTabsRaw] = useState<BottomBarTab[] | null>(null)
  const setCustomTabs = useCallback((tabs: BottomBarTab[] | null) => {
    setCustomTabsRaw(tabs)
  }, [])
  return { customTabs, setCustomTabs }
}

// ---------------------------------------------------------------------------
// Per-page hook — pages call this to override the bottom bar
// ---------------------------------------------------------------------------

export function useBottomBar(tabs: BottomBarTab[]) {
  const { setCustomTabs } = useContext(BottomBarContext)
  // Callers must memoize their tabs array (e.g. useMemo) so this effect
  // fires only when tab content actually changes — not on every render.
  useEffect(() => {
    setCustomTabs(tabs)
    return () => setCustomTabs(null)
  }, [tabs, setCustomTabs])
}
