import { describe, it, expect } from 'vitest'
import { formatPlate, isPlate, cleanPlate } from '../plateUtils'

describe('plateUtils', () => {
  describe('formatPlate', () => {
    it('formats multiple spaces correctly', () => {
      expect(formatPlate('34  HO  3448')).toBe('34 HO 3448')
      expect(formatPlate('34   TN   2229')).toBe('34 TN 2229')
    })

    it('formats contiguous strings without spaces', () => {
      expect(formatPlate('34TN2229')).toBe('34 TN 2229')
      expect(formatPlate('34HO3448')).toBe('34 HO 3448')
    })

    it('handles lowercase and dashed inputs', () => {
      expect(formatPlate('34-tn-2229')).toBe('34 TN 2229')
      expect(formatPlate('34-ho-3448')).toBe('34 HO 3448')
    })

    it('handles non-34 Turkish provinces', () => {
      expect(formatPlate('41BR123')).toBe('41 BR 123')
      expect(formatPlate('06BJK123')).toBe('06 BJK 123')
      expect(formatPlate('16 M 1234')).toBe('16 M 1234')
    })

    it('handles 1-letter, 2-letter, and 3-letter combinations with 2 to 5 digits', () => {
      expect(formatPlate('34a12345')).toBe('34 A 12345')
      expect(formatPlate('34AAA12')).toBe('34 AAA 12')
      expect(formatPlate('34AB1234')).toBe('34 AB 1234')
      expect(formatPlate('01T1234')).toBe('01 T 1234')
    })

    it('handles Turkish dotted/dotless i characters correctly', () => {
      expect(formatPlate('34 bi 123')).toBe('34 BI 123')
      expect(formatPlate('34 bİ 123')).toBe('34 BI 123')
      expect(formatPlate('34 bı 123')).toBe('34 BI 123')
    })

    it('returns null for null, empty or undefined', () => {
      expect(formatPlate(null)).toBeNull()
      expect(formatPlate(undefined)).toBeNull()
      expect(formatPlate('')).toBeNull()
      expect(formatPlate('   ')).toBeNull()
    })

    it('falls back gracefully on non-standard plate formats without throwing', () => {
      expect(formatPlate('TEST 1')).toBe('TEST 1')
      expect(formatPlate('SPECIAL   VIP')).toBe('SPECIAL VIP')
    })
  })

  describe('isPlate', () => {
    it('returns true for valid Turkish plate patterns', () => {
      expect(isPlate('34 HO 3448')).toBe(true)
      expect(isPlate('34TN2229')).toBe(true)
      expect(isPlate('41 BR 123')).toBe(true)
      expect(isPlate('06BJK123')).toBe(true)
      expect(isPlate('34 A 12345')).toBe(true)
      expect(isPlate('34-tn-2229')).toBe(true)
    })

    it('returns false for invalid inputs', () => {
      expect(isPlate('')).toBe(false)
      expect(isPlate('14R')).toBe(false)
      expect(isPlate('KADIKÖY')).toBe(false)
      expect(isPlate('123456')).toBe(false)
    })
  })

  describe('cleanPlate', () => {
    it('strips spaces, dashes and normalizes to uppercase ASCII', () => {
      expect(cleanPlate('34 HO 3448')).toBe('34HO3448')
      expect(cleanPlate('34-tn-2229')).toBe('34TN2229')
      expect(cleanPlate('34 bi 123')).toBe('34BI123')
      expect(cleanPlate(null)).toBe('')
    })
  })
})
