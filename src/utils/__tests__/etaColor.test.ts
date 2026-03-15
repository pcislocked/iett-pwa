import { describe, expect, it } from 'vitest'
import { etaBadgeClass, etaBucket, etaChipClass, etaTextClass } from '@/utils/etaColor'

describe('etaBucket', () => {
  it('maps null to far', () => {
    expect(etaBucket(null)).toBe('far')
  })

  it('maps <5 to soon', () => {
    expect(etaBucket(4)).toBe('soon')
  })

  it('maps 5-9 to coming', () => {
    expect(etaBucket(5)).toBe('coming')
    expect(etaBucket(9)).toBe('coming')
  })

  it('maps 10-19 to close', () => {
    expect(etaBucket(10)).toBe('close')
    expect(etaBucket(19)).toBe('close')
  })

  it('maps >=20 to far', () => {
    expect(etaBucket(20)).toBe('far')
    expect(etaBucket(42)).toBe('far')
  })
})

describe('eta class helpers', () => {
  it('returns static badge classes', () => {
    expect(etaBadgeClass(4)).toBe('eta-soon')
    expect(etaBadgeClass(7)).toBe('eta-coming')
    expect(etaBadgeClass(12)).toBe('eta-close')
    expect(etaBadgeClass(25)).toBe('eta-far')
  })

  it('returns static text classes', () => {
    expect(etaTextClass(4)).toBe('text-eta-soon')
    expect(etaTextClass(7)).toBe('text-eta-coming')
    expect(etaTextClass(12)).toBe('text-eta-close')
    expect(etaTextClass(25)).toBe('text-eta-far')
  })

  it('returns chip classes aligned to eta tokens', () => {
    expect(etaChipClass(4)).toBe('bg-eta-soon text-white')
    expect(etaChipClass(7)).toBe('bg-eta-coming text-black')
    expect(etaChipClass(12)).toBe('bg-eta-close text-white')
    expect(etaChipClass(25)).toBe('bg-eta-far text-slate-300')
  })
})
