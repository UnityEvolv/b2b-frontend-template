/**
 * What the browser must be able to do before the app loads.
 *
 * By capability, never by user agent: a browser that reports a supported
 * version but has WebRTC disabled by policy fails here, and a browser we have
 * never heard of that has everything passes. The check is cheap and runs first,
 * so an unusable browser sees a plain explanation rather than an office that
 * breaks the first time somebody presses the microphone.
 */
export type Capability = 'webrtc' | 'websocket' | 'media' | 'storage' | 'intl'

/** The parts of the global scope the check reads. `window` in the app; a fake in tests. */
export interface CapabilityEnvironment {
  RTCPeerConnection?: unknown
  WebSocket?: unknown
  navigator?: { mediaDevices?: { getUserMedia?: unknown } }
  localStorage?: unknown
  Intl?: { RelativeTimeFormat?: unknown; PluralRules?: unknown }
}

const CHECKS: Record<Capability, (env: CapabilityEnvironment) => boolean> = {
  webrtc: (env) => typeof env.RTCPeerConnection === 'function',
  websocket: (env) => typeof env.WebSocket === 'function',
  // Absent on an insecure origin as well as an old browser; both need the same fix.
  media: (env) => typeof env.navigator?.mediaDevices?.getUserMedia === 'function',
  // Presence, not access: private windows throw on access, and the app copes with that.
  storage: (env) => 'localStorage' in env,
  intl: (env) =>
    typeof env.Intl?.RelativeTimeFormat === 'function' &&
    typeof env.Intl.PluralRules === 'function',
}

export function missingCapabilities(env: CapabilityEnvironment): Capability[] {
  return (Object.keys(CHECKS) as Capability[]).filter((capability) => !CHECKS[capability](env))
}
