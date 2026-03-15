import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useFavorites } from '../useFavorites'
import type { Favorite } from '../useFavorites'

const STOP: Favorite = { kind: 'stop', dcode: '220602', name: 'AHMET MİTHAT EFENDİ' }
const ROUTE: Favorite = { kind: 'route', hat_kodu: '500T', name: 'TUZLA - LEVENT' }
const STOP2: Favorite = { kind: 'stop', dcode: '301341', name: '4.LEVENT METRO' }

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with an empty list when localStorage is empty', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
  })

  it('toggle adds an item that was not present', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => { result.current.toggle(STOP) })
    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0]).toEqual(STOP)
  })

  it('toggle removes an item that already exists', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => { result.current.toggle(STOP) })
    act(() => { result.current.toggle(STOP) })
    expect(result.current.favorites).toHaveLength(0)
  })

  it('isFavorite returns true for a toggled-in item', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => { result.current.toggle(STOP) })
    expect(result.current.isFavorite(STOP)).toBe(true)
  })

  it('isFavorite returns false for an item not in favorites', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.isFavorite(STOP)).toBe(false)
  })

  it('persists favorites to localStorage on toggle', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => { result.current.toggle(STOP) })
    const stored = JSON.parse(localStorage.getItem('iett_favorites') ?? '[]') as Favorite[]
    expect(stored).toHaveLength(1)
    expect(stored[0].kind).toBe('stop')
  })

  it('loads existing favorites from localStorage on mount', () => {
    localStorage.setItem('iett_favorites', JSON.stringify([ROUTE]))
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0]).toEqual(ROUTE)
  })

  it('can hold both stop and route favorites independently', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => { result.current.toggle(STOP) })
    act(() => { result.current.toggle(ROUTE) })
    expect(result.current.favorites).toHaveLength(2)
    expect(result.current.isFavorite(STOP)).toBe(true)
    expect(result.current.isFavorite(ROUTE)).toBe(true)
  })

  it('removing one item does not affect the other', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => { result.current.toggle(STOP) })
    act(() => { result.current.toggle(STOP2) })
    act(() => { result.current.toggle(STOP) })
    expect(result.current.isFavorite(STOP)).toBe(false)
    expect(result.current.isFavorite(STOP2)).toBe(true)
  })

  it('returns an empty list when localStorage contains invalid JSON', () => {
    localStorage.setItem('iett_favorites', 'not-json')
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
  })
})
