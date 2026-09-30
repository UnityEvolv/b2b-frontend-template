import { describe, expect, it } from 'vitest'

import { PRODUCT } from '@b2b-template/product-config'

import { createI18n, en, pickLanguage } from './index'

describe('pickLanguage', () => {
  it('prefers the saved setting, then the device, then English', () => {
    expect(pickLanguage('en', ['de'])).toBe('en')
    expect(pickLanguage(null, ['de-DE', 'en-GB'])).toBe('en')
    expect(pickLanguage(undefined, ['fr'])).toBe('en')
    expect(pickLanguage('xx', [])).toBe('en')
  })
})

describe('createI18n', () => {
  it('is ready synchronously, with interpolation and namespaces', () => {
    const i18n = createI18n()
    expect(i18n.t('common:userMenu', { name: 'Asha & Co' })).toBe('Account menu for Asha & Co')
    expect(i18n.t('admin:nav.users')).toBe('Users')
  })

  it('fills in the product name from the config', () => {
    const i18n = createI18n()
    expect(i18n.t('common:unsupported.title')).toBe(
      `This browser cannot run ${PRODUCT.productName}`,
    )
    expect(i18n.t('mobile:title')).toBe(PRODUCT.productName)
  })
})

/** Every string, with the path to it. */
function strings(value: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof value === 'string') return [[path.join('.'), value]]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, v]) => strings(v, [...path, key]))
}

describe('the strings', () => {
  it('never name the product, and say nothing about a product this template is not', () => {
    // The product's name is `{{product}}`; these words belong to another product.
    const foreign = /unityevolv|ofiskit|\boffices?\b|\brooms?\b|\bknock|\bcall(s|ed|ing)?\b/i
    const offending = strings(en).filter(([, text]) => foreign.test(text))
    expect(offending).toEqual([])
  })
})

describe('a product’s own namespace', () => {
  it('sits beside the template’s, and never replaces one of them', () => {
    // A product declares its namespace on ProductResources; this test has none, so it casts.
    const product = {
      en: {
        widgets: { title: 'Widgets for {{product}}' },
        common: { userMenu: 'replaced' },
      },
    } as never
    const i18n = createI18n('en', product)
    expect(i18n.t('widgets:title' as never)).toBe(`Widgets for ${PRODUCT.productName}`)
    expect(i18n.t('common:userMenu', { name: 'Asha' })).toBe('Account menu for Asha')
    expect(i18n.options.ns).toContain('widgets')
  })
})
