import { serviceNames } from '@b2b-template/api'
import { createAuth } from '@b2b-template/client'

import { configured, readConfig } from './config'
import { env } from './env'
import { keystore } from './platform/keystore'

/** What this build talks to, read once. */
export const config = readConfig(env, serviceNames)

/**
 * Sign-in and the session (UO-89): the same client as web, with the session
 * cookie in the keystore and a token refreshed before any call that would
 * otherwise go without one. The identity service knows the phone as the
 * employee app, so its emails and links are the employee app's.
 */
export const auth = configured(config)
  ? createAuth({
      app: 'ofis',
      ...(config.apiOrigin ? { apiOrigin: config.apiOrigin } : {}),
      serviceOrigin: config.serviceOrigin,
      envPrefix: 'EXPO_PUBLIC_',
      cookies: keystore,
      refreshOnRequest: true,
    })
  : null

export type MobileAuth = NonNullable<typeof auth>

/** The auth client, for a screen that only renders once the build is configured. */
export function requireAuth(): MobileAuth {
  if (!auth) throw new Error('this build has no API address')
  return auth
}
