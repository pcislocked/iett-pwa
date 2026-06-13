import { describe, it, expect, beforeEach } from 'vitest'
import i18n from '@/i18n'
import en from '../../public/locales/en.json'
import tr from '../../public/locales/tr.json'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getKeys = (obj: any, prefix = ''): string[] => {
      let keys: string[] = []
      if (!obj || typeof obj !== 'object') return keys
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          keys = keys.concat(getKeys(obj[key], `${prefix}${key}.`))
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
  })
})
