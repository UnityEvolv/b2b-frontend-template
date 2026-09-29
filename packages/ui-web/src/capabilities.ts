/**
 * What the browser must be able to do before an app loads.
 *
 * Each app declares what it needs in its definition; nothing is required by
 * default. By capability, never by user agent: a browser that reports a
 * supported version but has a feature disabled by policy fails here, and a
 * browser we have never heard of that has everything passes. The check is
 * cheap and runs first, so an unusable browser sees a plain explanation
 * rather than an app that breaks later.
 */
export type Capability = 'websocket' | 'storage' | 'intl'

/** The parts of the global scope the check reads. `window` in the app; a fake in tests. */
export interface CapabilityEnvironment {
  WebSocket?: unknown
  localStorage?: unknown
  Intl?: { RelativeTimeFormat?: unknown; PluralRules?: unknown }
}

const CHECKS: Record<Capability, (env: CapabilityEnvironment) => boolean> = {
  websocket: (env) => typeof env.WebSocket === 'function',
  // Presence, not access: private windows throw on access, and the app copes with that.
  storage: (env) => 'localStorage' in env,
  intl: (env) =>
    typeof env.Intl?.RelativeTimeFormat === 'function' &&
    typeof env.Intl.PluralRules === 'function',
}

/** The capabilities an app requires that this browser lacks. */
export function missingCapabilities(
  env: CapabilityEnvironment,
  required: readonly Capability[] = [],
): Capability[] {
  return required.filter((capability) => !CHECKS[capability](env))
}
