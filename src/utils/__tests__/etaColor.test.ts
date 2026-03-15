import { describe, expect, it } from 'vitest'
import { etaBadgeClass, etaBucket, etaChipClass, etaTextClass } from '@/utils/etaColor'

describe('etaBucket', () => {
  it('maps null to far', () => {
    expect(etaBucket(null)).toBe('far')
  })

  it('maps <5 to soon', () => {
    expect(etaBucket(1)).toBe('soon')
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
    expect(etaTextClass(1)).toBe('text-red-500')
    expect(etaTextClass(4)).toBe('text-red-500')
    expect(etaTextClass(7)).toBe('text-orange-500')
    expect(etaTextClass(12)).toBe('text-emerald-500')
    expect(etaTextClass(25)).toBe('text-slate-500')
  })

  it('returns chip classes with explicit eta colors', () => {
    expect(etaChipClass(1)).toBe('bg-red-500 text-white')
    expect(etaChipClass(4)).toBe('bg-red-500 text-white')
    expect(etaChipClass(7)).toBe('bg-orange-500 text-black')
    expect(etaChipClass(12)).toBe('bg-emerald-500 text-white')
    expect(etaChipClass(25)).toBe('bg-slate-600 text-slate-300')
  })
})
