import { describe, it, expect, beforeEach } from 'vitest'
import { getRecent, addRecent, clearRecent, type RecentSearch } from '../useRecentSearches'

describe('useRecentSearches', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with empty list when localStorage is empty', () => {
    expect(getRecent()).toEqual([])
  })

  it('adds items and deduplicates with click promotion to top', () => {
    const item1: RecentSearch = { kind: 'route', code: '14R', name: 'KADIKÖY - KOZYATAĞI' }
    const item2: RecentSearch = { kind: 'route', code: '19F', name: 'YEDİTEPE ÜNİVERSİTESİ - KADIKÖY' }

    addRecent(item1)
    addRecent(item2)

    let list = getRecent()
    expect(list[0].code).toBe('19F')
    expect(list[1].code).toBe('14R')

    // Click promotion: re-adding 14R promotes it to index 0
    addRecent(item1)
    list = getRecent()
    expect(list[0].code).toBe('14R')
    expect(list[1].code).toBe('19F')
    expect(list).toHaveLength(2)
  })

  it('stores stop items with direction and promotes them', () => {
    const stopItem: RecentSearch = {
      kind: 'stop',
      code: '220602',
      name: 'AHMET MİTHAT EFENDİ',
      direction: 'KADIKÖY',
    }
    addRecent(stopItem)

    const list = getRecent()
    expect(list[0]).toEqual(stopItem)
    expect(list[0].direction).toBe('KADIKÖY')
  })

  it('supports up to 25 items in recent search history', () => {
    for (let i = 1; i <= 30; i++) {
      addRecent({ kind: 'route', code: `HAT-${i}`, name: `Hat ${i}` })
    }

    const list = getRecent()
    expect(list).toHaveLength(25)
    // Most recent is HAT-30
    expect(list[0].code).toBe('HAT-30')
    // Oldest retained is HAT-6 (HAT-1 to HAT-5 evicted)
    expect(list[24].code).toBe('HAT-6')
  })

  it('clears all recent searches when clearRecent is called', () => {
    addRecent({ kind: 'route', code: '500T', name: 'TUZLA - CEVİZLİBAĞ' })
    expect(getRecent()).toHaveLength(1)

    clearRecent()
    expect(getRecent()).toHaveLength(0)
  })
})
