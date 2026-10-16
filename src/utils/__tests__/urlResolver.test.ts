import { describe, it, expect } from 'vitest'
import { parseIettShare } from '../urlResolver'

describe('urlResolver - parseIettShare', () => {
  describe('route links', () => {
    it('extracts route from standard RouteDetail URL', () => {
      const res = parseIettShare(null, 'https://iett.istanbul/RouteDetail?hkod=14R&routename=rasathane-kadikoy')
      expect(res).toEqual({ kind: 'route', code: '14R' })
    })

    it('handles lowercase route codes and converts to uppercase', () => {
      const res = parseIettShare('https://iett.istanbul/tr/RouteStation/RouteDetail?hkod=500t')
      expect(res).toEqual({ kind: 'route', code: '500T' })
    })

    it('extracts route from icerik/hat-detayi URL', () => {
      const res = parseIettShare('https://iett.istanbul/icerik/hat-detayi?hat=14M')
      expect(res).toEqual({ kind: 'route', code: '14M' })
    })

    it('extracts route from internal path', () => {
      const res = parseIettShare('/routes/15F')
      expect(res).toEqual({ kind: 'route', code: '15F' })
    })

    it('strips trailing punctuation from shared text with URL', () => {
      const res = parseIettShare('Şuna bir baksana: https://iett.istanbul/RouteDetail?hkod=14R.')
      expect(res).toEqual({ kind: 'route', code: '14R' })
    })
  })

  describe('stop links', () => {
    it('extracts stop from standard StationDetail URL', () => {
      const res = parseIettShare(null, 'https://iett.istanbul/StationDetail?dkod=259631&stationname=UMRANIYE')
      expect(res).toEqual({ kind: 'stop', code: '259631' })
    })

    it('extracts stop from tr/RouteStation/StationDetail URL', () => {
      const res = parseIettShare('https://iett.istanbul/tr/RouteStation/StationDetail?dkod=220441')
      expect(res).toEqual({ kind: 'stop', code: '220441' })
    })

    it('extracts stop from icerik/durak-detayi URL', () => {
      const res = parseIettShare('https://iett.istanbul/icerik/durak-detayi?durak=113333')
      expect(res).toEqual({ kind: 'stop', code: '113333' })
    })

    it('extracts stop from internal path', () => {
      const res = parseIettShare('/stops/259631')
      expect(res).toEqual({ kind: 'stop', code: '259631' })
    })

    it('strips trailing punctuation from shared stop link', () => {
      const res = parseIettShare('İndireceğin durak burası: https://iett.istanbul/StationDetail?dkod=220441!')
      expect(res).toEqual({ kind: 'stop', code: '220441' })
    })
  })

  describe('plain text and search fallbacks', () => {
    it('returns search query for plain text', () => {
      const res = parseIettShare('Kadıköy Rıhtım')
      expect(res).toEqual({ kind: 'search', query: 'Kadıköy Rıhtım' })
    })

    it('extracts search query from iett.istanbul search query parameter', () => {
      const res = parseIettShare('https://iett.istanbul/search?q=Besiktas')
      expect(res).toEqual({ kind: 'search', query: 'Besiktas' })
    })
  })

  describe('safety and edge cases', () => {
    it('returns null for empty, null, or undefined', () => {
      expect(parseIettShare(null, null)).toBeNull()
      expect(parseIettShare('', '')).toBeNull()
      expect(parseIettShare(undefined, undefined)).toBeNull()
    })

    it('returns null for unrelated external URLs', () => {
      expect(parseIettShare('https://google.com/search?q=iett')).toBeNull()
    })

    it('does not throw on malformed percent encoding', () => {
      expect(() => parseIettShare('https://iett.istanbul/RouteDetail?hkod=14R%E0%A4%A')).not.toThrow()
    })
  })
})
