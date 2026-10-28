import { describe, it, expect, beforeEach } from 'vitest'
import i18n from '@/i18n'
import en from '../../public/locales/en.json'
import tr from '../../public/locales/tr.json'
import ku from '../../public/locales/ku.json'

describe('i18n configuration', () => {
  beforeEach(async () => {
    // wait for init
    await i18n.init()
  })

  it('i18n_loads_turkish_by_default', () => {
    expect(i18n.language).toBe('tr')
  })

  it('i18n_switches_language_when_invoked', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.language).toBe('en')
    await i18n.changeLanguage('tr')
    expect(i18n.language).toBe('tr')
  })

  it('translations_json_files_have_matching_keys', () => {
    const getKeys = (obj: unknown, prefix = ''): string[] => {
      let keys: string[] = []
      if (!obj || typeof obj !== 'object') return keys
      const record = obj as Record<string, unknown>
      for (const key in record) {
        const val = record[key]
        if (typeof val === 'object' && val !== null) {
          keys = keys.concat(getKeys(val, `${prefix}${key}.`))
        } else {
          keys.push(`${prefix}${key}`)
        }
      }
      return keys
    }

    const enKeys = getKeys(en)
    const trKeys = getKeys(tr)

    // Verify all EN keys exist in TR
    for (const key of enKeys) {
      expect(trKeys).toContain(key)
    }

    // Verify all TR keys exist in EN
    for (const key of trKeys) {
      expect(enKeys).toContain(key)
    }

    const kuKeys = getKeys(ku)
    // Verify all TR keys exist in KU (Braille placeholder parity)
    for (const key of trKeys) {
      expect(kuKeys).toContain(key)
    }
  })
})
