import { describe, expect, it } from 'vitest'

import { createI18n, pickLanguage } from './index'

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
})
