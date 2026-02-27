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

function load(): Favorite[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Favorite[]
  } catch {
    return []
  }
}

function save(favs: Favorite[]) {
  localStorage.setItem(KEY, JSON.stringify(favs))
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

  return { favorites, toggle, isFavorite }
}
