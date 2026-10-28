import { describe, it, expect } from 'vitest'
import { formatBusDirectionLabel } from '../busDirectionLabel'
import type { RouteMetadata, RouteStop } from '@/api/client'

describe('formatBusDirectionLabel', () => {
  const fallback = 'Yön Bilgisi Yok'

  it('returns fallback text when all input fields are null/empty', () => {
    expect(formatBusDirectionLabel({}, fallback)).toBe(fallback)
  })

  it('formats ring route with (RİNG) tag when direction_name contains RING or RİNG', () => {
    const meta: RouteMetadata[] = [
      {
        hat_kodu: '4',
        direction_name: 'KADIKÖY - RİNG',
        full_name: 'KADIKÖY - RİNG Gidiş',
        variant_code: '4_G_D0',
        direction: 0,
        depar_no: 0,
        hat_id: 1,
      },
    ]
    expect(formatBusDirectionLabel({ metadata: meta }, fallback)).toBe('KADIKÖY - RİNG')
  })

  it('formats ring route when endpoints are identical', () => {
    const meta: RouteMetadata[] = [
      {
        hat_kodu: '4',
        direction_name: 'KADIKÖY - KADIKÖY',
        full_name: 'KADIKÖY - KADIKÖY Gidiş',
        variant_code: '4_G_D0',
        direction: 0,
        depar_no: 0,
        hat_id: 1,
      },
    ]
    expect(formatBusDirectionLabel({ metadata: meta }, fallback)).toBe('KADIKÖY (RİNG)')
  })

  it('formats known direction G using direction_letter', () => {
    const meta: RouteMetadata[] = [
      {
        hat_kodu: '48H',
        direction_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ',
        full_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ Gidiş',
        variant_code: '48H_G_D0',
        direction: 0,
        depar_no: 0,
        hat_id: 298,
      },
      {
        hat_kodu: '48H',
        direction_name: 'ŞİŞLİ MERKEZ - HAMİDİYE MAHALLESİ',
        full_name: 'ŞİŞLİ MERKEZ - HAMİDİYE MAHALLESİ Dönüş',
        variant_code: '48H_D_D0',
        direction: 1,
        depar_no: 0,
        hat_id: 298,
      },
    ]
    expect(formatBusDirectionLabel({ direction_letter: 'G', metadata: meta }, fallback)).toBe(
      'HAMİDİYE MAHALLESİ → ŞİŞLİ MERKEZ',
    )
  })

  it('formats known direction D using direction_letter', () => {
    const meta: RouteMetadata[] = [
      {
        hat_kodu: '48H',
        direction_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ',
        full_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ Gidiş',
        variant_code: '48H_G_D0',
        direction: 0,
        depar_no: 0,
        hat_id: 298,
      },
      {
        hat_kodu: '48H',
        direction_name: 'ŞİŞLİ MERKEZ - HAMİDİYE MAHALLESİ',
        full_name: 'ŞİŞLİ MERKEZ - HAMİDİYE MAHALLESİ Dönüş',
        variant_code: '48H_D_D0',
        direction: 1,
        depar_no: 0,
        hat_id: 298,
      },
    ]
    expect(formatBusDirectionLabel({ direction_letter: 'D', metadata: meta }, fallback)).toBe(
      'ŞİŞLİ MERKEZ → HAMİDİYE MAHALLESİ',
    )
  })

  it('matches first_stop (from mission) to determine orientation and avoids dangling arrow', () => {
    const meta: RouteMetadata[] = [
      {
        hat_kodu: '48H',
        direction_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ',
        full_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ Gidiş',
        variant_code: '48H_G_D0',
        direction: 0,
        depar_no: 0,
        hat_id: 298,
      },
    ]
    expect(
      formatBusDirectionLabel(
        { first_stop: 'HAMİDİYE MAHALLESİ', metadata: meta },
        fallback,
      ),
    ).toBe('HAMİDİYE MAHALLESİ → ŞİŞLİ MERKEZ')

    expect(
      formatBusDirectionLabel(
        { first_stop: 'ŞİŞLİ MERKEZ', metadata: meta },
        fallback,
      ),
    ).toBe('ŞİŞLİ MERKEZ → HAMİDİYE MAHALLESİ')
  })

  it('falls back to dash route name without arrow when specific direction cannot be determined', () => {
    const meta: RouteMetadata[] = [
      {
        hat_kodu: '48H',
        direction_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ',
        full_name: 'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ Gidiş',
        variant_code: '48H_G_D0',
        direction: 0,
        depar_no: 0,
        hat_id: 298,
      },
    ]
    expect(formatBusDirectionLabel({ metadata: meta }, fallback)).toBe(
      'HAMİDİYE MAHALLESİ - ŞİŞLİ MERKEZ',
    )
  })

  it('uses route_stops start and end when metadata is not provided', () => {
    const stops: RouteStop[] = [
      { route_code: '15TY_G0', stop_code: '1', stop_name: 'DURAK A', direction: 'G', sequence: 1, latitude: 41.0, longitude: 29.0, district: 'Beykoz' },
      { route_code: '15TY_G0', stop_code: '2', stop_name: 'DURAK B', direction: 'G', sequence: 2, latitude: 41.1, longitude: 29.1, district: 'Üsküdar' },
    ]
    expect(formatBusDirectionLabel({ direction_letter: 'G', route_stops: stops }, fallback)).toBe(
      'DURAK A → DURAK B',
    )
  })

  it('cleans up single direction string without prepending dangling arrow if no metadata exists', () => {
    expect(formatBusDirectionLabel({ direction: 'LEVENT' }, fallback)).toBe('LEVENT')
  })
})
