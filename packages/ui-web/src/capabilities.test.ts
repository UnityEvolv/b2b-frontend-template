import { describe, expect, it } from 'vitest'

import { missingCapabilities, type CapabilityEnvironment } from './capabilities'

const everything: CapabilityEnvironment = {
  RTCPeerConnection: function RTCPeerConnection() {},
  WebSocket: function WebSocket() {},
  navigator: { mediaDevices: { getUserMedia: () => {} } },
  localStorage: {},
  Intl: { RelativeTimeFormat: function () {}, PluralRules: function () {} },
}

describe('missingCapabilities', () => {
  it('passes a browser with everything', () => {
    expect(missingCapabilities(everything)).toEqual([])
  })

  it('names each missing capability', () => {
    expect(missingCapabilities({ ...everything, RTCPeerConnection: undefined })).toEqual(['webrtc'])
    // An insecure origin hides mediaDevices entirely.
    expect(missingCapabilities({ ...everything, navigator: {} })).toEqual(['media'])
    expect(missingCapabilities({})).toEqual(['webrtc', 'websocket', 'media', 'storage', 'intl'])
  })

  it('checks capabilities, not the user agent', () => {
    const claimsChrome = {
      ...everything,
      navigator: { userAgent: 'Chrome/140' },
    } as CapabilityEnvironment
    expect(missingCapabilities(claimsChrome)).toEqual(['media'])
  })
})
