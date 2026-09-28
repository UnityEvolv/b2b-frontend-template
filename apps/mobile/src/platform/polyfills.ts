import * as Crypto from 'expo-crypto'

/**
 * What the shared packages expect of the platform and Hermes may lack:
 * `crypto.randomUUID` for idempotency keys and device ids, and
 * `crypto.getRandomValues`. Imported first, before anything uses them.
 */
const g = globalThis as unknown as {
  crypto?: { randomUUID?: () => string; getRandomValues?: <T>(array: T) => T }
}
g.crypto ??= {}
g.crypto.randomUUID ??= () => Crypto.randomUUID()
g.crypto.getRandomValues ??= <T>(array: T) =>
  Crypto.getRandomValues(array as unknown as Uint8Array) as unknown as T
