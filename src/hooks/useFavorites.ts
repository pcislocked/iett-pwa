import { useState, useCallback } from 'react'

export interface FavoriteStop {
  kind: 'stop'
  dcode: string
  name: string
}

export interface FavoriteRoute {
  kind: 'route'
  hat_kodu: string
  name: string
}

export type Favorite = FavoriteStop | FavoriteRoute

const KEY = 'iett_favorites'

function isValidFavorite(item: unknown): item is Favorite {
  if (!item || typeof item !== 'object') return false
  const rec = item as Record<string, unknown>
  if (rec.kind === 'stop') {
    return typeof rec.dcode === 'string' && rec.dcode.length > 0 && typeof rec.name === 'string'
  }
  if (rec.kind === 'route') {
    return typeof rec.hat_kodu === 'string' && rec.hat_kodu.length > 0 && typeof rec.name === 'string'
  }
  return false
}

function load(): Favorite[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isValidFavorite) : []
  } catch {
    return []
  }
}

function save(favs: Favorite[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(favs))
  } catch (e) {
    console.warn('Failed to save favorites to localStorage', e)
  }
}

function sameItem(a: Favorite, b: Favorite): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'stop' && b.kind === 'stop') return a.dcode === b.dcode
  if (a.kind === 'route' && b.kind === 'route') return a.hat_kodu === b.hat_kodu
  return false
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(load)

  const toggle = useCallback((item: Favorite) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => sameItem(f, item))
      const next = exists ? prev.filter((f) => !sameItem(f, item)) : [...prev, item]
      save(next)
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (item: Favorite) => favorites.some((f) => sameItem(f, item)),
    [favorites],
  )

  const reorder = useCallback((newFavorites: Favorite[]) => {
    setFavorites(newFavorites)
    save(newFavorites)
  }, [])

  return { favorites, toggle, isFavorite, reorder }
}
