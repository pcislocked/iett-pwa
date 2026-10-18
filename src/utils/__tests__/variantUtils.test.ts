import { describe, it, expect } from 'vitest'
import { formatStopName, getVariantDisplayName } from '../variantUtils'
import type { RouteMetadata, RouteStop } from '@/api/client'

describe('variantUtils', () => {
  describe('formatStopName', () => {
    it('strips dashes and trims whitespace', () => {
      expect(formatStopName('KADIKÖY - Kadıköy')).toBe('KADIKÖY')
      expect(formatStopName('BEŞİKTAŞ İSKELE')).toBe('BEŞİKTAŞ İSKELE')
      expect(formatStopName(' ÜMRANİYE - Çekmeköy ')).toBe('ÜMRANİYE')
    })
  })

  describe('getVariantDisplayName', () => {
    const makeStop = (name: string, seq: number): RouteStop => ({
      route_code: '16D_G_D0',
      stop_code: `S${seq}`,
      stop_name: name,
      direction: 'G',
      sequence: seq,
      latitude: 41.0,
      longitude: 29.0,
      district: 'Kadıköy',
    })

    it('formats normal linear routes as First > Last', () => {
      const stops: RouteStop[] = [
        makeStop('KADIKÖY - Kadıköy', 1),
        makeStop('BOSTANCI - Kadıköy', 2),
        makeStop('MALTEPE - Maltepe', 3),
      ]

      const name = getVariantDisplayName({
        variantCode: '16D_G_D0',
        variantStops: stops,
      })

      expect(name).toBe('KADIKÖY > MALTEPE')
    })

    it('appends variant suffix for non-canonical variants', () => {
      const stops: RouteStop[] = [
        makeStop('KADIKÖY', 1),
        makeStop('PENDİK', 2),
      ]

      const name = getVariantDisplayName({
        variantCode: '16D_G_D6238',
        variantStops: stops,
      })

      expect(name).toBe('KADIKÖY > PENDİK (D6238)')
    })

    it('detects ring routes and resolves apex stop from 3-part metadata direction_name', () => {
      const stops: RouteStop[] = [
        makeStop('KADIKÖY', 1),
        makeStop('MODA İSKELE', 2),
        makeStop('KADIKÖY', 3),
      ]

      const meta: RouteMetadata = {
        hat_kodu: '8A',
        variant_code: '8A_G_D0',
        direction: 1,
        depar_no: 0,
        direction_name: 'KADIKÖY - MODA - KADIKÖY',
        full_name: 'KADIKÖY - MODA RING',
      }

      const name = getVariantDisplayName({
        variantCode: '8A_G_D0',
        metadata: meta,
        variantStops: stops,
      })

      expect(name).toBe('🔄 KADIKÖY > MODA Ring')
    })

    it('detects ring routes and falls back to midpoint stop when metadata has no apex', () => {
      const stops: RouteStop[] = [
        makeStop('KADIKÖY', 1),
        makeStop('ALTIYOL', 2),
        makeStop('MODA CAD.', 3),
        makeStop('RITIM SOK.', 4),
        makeStop('KADIKÖY', 5),
      ]

      const name = getVariantDisplayName({
        variantCode: '8A_G_D0',
        variantStops: stops,
      })

      expect(name).toBe('🔄 KADIKÖY > MODA CAD. Ring')
    })

    it('handles ring routes with non-canonical suffix', () => {
      const stops: RouteStop[] = [
        makeStop('KADIKÖY', 1),
        makeStop('MODA', 2),
        makeStop('KADIKÖY', 3),
      ]

      const name = getVariantDisplayName({
        variantCode: '8A_G_D1234',
        variantStops: stops,
      })

      expect(name).toBe('🔄 KADIKÖY > MODA Ring (D1234)')
    })

    it('falls back to metadata when variant stops are not provided', () => {
      const metaLinear: RouteMetadata = {
        hat_kodu: '500T',
        variant_code: '500T_G_D0',
        direction: 1,
        depar_no: 0,
        direction_name: 'TUZLA - CEVİZLİBAĞ',
        full_name: 'TUZLA - CEVİZLİBAĞ',
      }

      expect(
        getVariantDisplayName({
          variantCode: '500T_G_D0',
          metadata: metaLinear,
        })
      ).toBe('TUZLA > CEVİZLİBAĞ')

      const metaRing: RouteMetadata = {
        hat_kodu: '14KS',
        variant_code: '14KS_G_D0',
        direction: 1,
        depar_no: 0,
        direction_name: 'KORUPARK - AYDINLI - KORUPARK',
        full_name: 'KORUPARK - AYDINLI RING',
      }

      expect(
        getVariantDisplayName({
          variantCode: '14KS_G_D0',
          metadata: metaRing,
        })
      ).toBe('🔄 KORUPARK > AYDINLI Ring')
    })

    it('falls back to raw variant code when no metadata or stops are available', () => {
      expect(
        getVariantDisplayName({
          variantCode: '15F_D_D0',
        })
      ).toBe('15F_D_D0')
    })
  })
})
