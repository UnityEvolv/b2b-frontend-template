import {
  createAuth as createSharedAuth,
  type Auth,
  type AuthOptions as SharedAuthOptions,
  type SignedOutReason,
} from '@b2b-template/client'

import { readCache, writeCache } from './storage'

/**
 * Sign-in and the session behind it (UO-63), for every web app.
 *
 * The logic is shared with the phone in @b2b-template/client (UO-89). On web
 * the browser carries the session cookie, and the preferences are cached in
 * local storage for first paint.
 */
export {
  serviceOrigins,
  SignInRefused,
  type AccessToken,
  type Auth,
  type LocalSignInResult,
  type MfaStep,
  type SignedOutReason,
  type SignInClient,
} from '@b2b-template/client'

export type AuthOptions = Omit<SharedAuthOptions, 'cookies' | 'cache' | 'envPrefix'>

export function createAuth(options: AuthOptions): Auth & { reason(): SignedOutReason | null } {
  return createSharedAuth({
    ...options,
    envPrefix: 'VITE_',
    cache: { read: readCache, write: writeCache },
  })
}
