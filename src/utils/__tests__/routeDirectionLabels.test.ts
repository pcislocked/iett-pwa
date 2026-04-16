import { describe, expect, it } from 'vitest'
import { getDirectionLabel, getDirectionLabelMap } from '@/utils/routeDirectionLabels'
import type { RouteMetadata } from '@/api/client'

describe('routeDirectionLabels', () => {
  it('extracts D/G labels from metadata when both directions exist', () => {
    const metadata: RouteMetadata[] = [
      {
        hat_kodu: '14M',
        direction_name: 'Kadikoy - Besiktas',
        full_name: 'Kadikoy - Besiktas',
        variant_code: '14M_G_G0',
        direction: 0,
        depar_no: 1,
      },
      {
        hat_kodu: '14M',
        direction_name: 'Besiktas - Kadikoy',
        full_name: 'Besiktas - Kadikoy',
        variant_code: '14M_D_D0',
        direction: 1,
        depar_no: 2,
      },
    ]

    const map = getDirectionLabelMap(metadata)
    expect(map.G).toBe('Kadikoy')
    expect(map.D).toBe('Besiktas')
  })

  it('derives missing opposite direction label from a single direction_name', () => {
    const metadata: RouteMetadata[] = [
      {
        hat_kodu: '500T',
        direction_name: 'Tuzla - Cevizlibag',
        full_name: 'Tuzla - Cevizlibag',
        variant_code: '500T_D_D0',
        direction: 1,
        depar_no: 1,
      },
    ]

    const map = getDirectionLabelMap(metadata)
    expect(map.D).toBe('Tuzla')
    expect(map.G).toBe('Cevizlibag')
  })

  it('uses Turkish fallback labels when metadata is absent', () => {
    expect(getDirectionLabel('G', null)).toBe('Gidiş')
    expect(getDirectionLabel('D', null)).toBe('Dönüş')
    expect(getDirectionLabel('X', null)).toBe('X')
  })
})
