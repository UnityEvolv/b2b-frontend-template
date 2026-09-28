import type { ServiceName } from '@b2b-template/api'

/**
 * The build's configuration, as the app reads it (UO-47, UO-89). Pure, so
 * it is tested without a device.
 *
 * `EXPO_PUBLIC_*` values are inlined at build time, and only where the code
 * names them in full: `process.env[key]` would be empty on a device. So the
 * app's entry lists each variable by name and hands the object here.
 *
 * Deployed, `EXPO_PUBLIC_API_ORIGIN` is the gateway and every service is a
 * path under it; against a laptop's compose stack each service has its own
 * port, named `EXPO_PUBLIC_API_ORIGIN_<SERVICE>`.
 */
export interface MobileConfig {
  apiOrigin?: string
  serviceOrigin: Partial<Record<ServiceName, string>>
}

export type Env = Record<string, string | undefined>

/** An origin without a trailing slash, or undefined for nothing usable. */
export function origin(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, '')
  if (!trimmed) return undefined
  return /^(https?|wss?):\/\/[^/\s]+/.test(trimmed) ? trimmed : undefined
}

export function readConfig(env: Env, services: readonly ServiceName[]): MobileConfig {
  const serviceOrigin: Partial<Record<ServiceName, string>> = {}
  for (const name of services) {
    const value = origin(env[`EXPO_PUBLIC_API_ORIGIN_${name.toUpperCase()}`])
    if (value) serviceOrigin[name] = value
  }
  const apiOrigin = origin(env.EXPO_PUBLIC_API_ORIGIN)
  return {
    ...(apiOrigin ? { apiOrigin } : {}),
    serviceOrigin,
  }
}

/** Whether the build can reach anything at all: an API for identity. */
export function configured(config: MobileConfig): boolean {
  return Boolean(config.apiOrigin || config.serviceOrigin.identity)
}
