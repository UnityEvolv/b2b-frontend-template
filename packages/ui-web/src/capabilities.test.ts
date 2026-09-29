import { describe, expect, it } from 'vitest'

import { missingCapabilities, type CapabilityEnvironment } from './capabilities'

const everything: CapabilityEnvironment = {
  WebSocket: function WebSocket() {},
  localStorage: {},
  Intl: { RelativeTimeFormat: function () {}, PluralRules: function () {} },
}

describe('missingCapabilities', () => {
  it('requires nothing unless the app declares it', () => {
    expect(missingCapabilities({})).toEqual([])
  })

  it('names each declared capability the browser lacks', () => {
    const all = ['websocket', 'storage', 'intl'] as const
    expect(missingCapabilities(everything, all)).toEqual([])
    expect(missingCapabilities({ ...everything, WebSocket: undefined }, all)).toEqual(['websocket'])
    expect(missingCapabilities({}, all)).toEqual(['websocket', 'storage', 'intl'])
    expect(missingCapabilities({}, ['intl'])).toEqual(['intl'])
  })

  it('checks capabilities, not the user agent', () => {
    const claimsChrome = { navigator: { userAgent: 'Chrome/140' } } as CapabilityEnvironment
    expect(missingCapabilities(claimsChrome, ['storage'])).toEqual(['storage'])
  })
})
