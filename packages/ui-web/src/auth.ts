import {
  createAuth as createSharedAuth,
  type Auth,
  type AuthOptions as SharedAuthOptions,
  type SignedOutReason,
} from '@b2b-template/client'

import { readCache, writeCache } from './storage'
import { supportRequested } from './support'

/**
 * Sign-in and the session behind it, for every web app.
 *
 * The logic is shared with the phone in @b2b-template/client. On web
 * the browser carries the session cookie, and the preferences are cached in
 * local storage for first paint. A tab the platform app opened with
 * `?support=1` is a support session (see `./support`), unless the app
 * says otherwise with `support`.
 */
export {
  serviceOrigins,
  SignInRefused,
  type AccessToken,
  type SupportControl,
  type SupportEnd,
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
    support: options.support ?? supportRequested(),
    envPrefix: 'VITE_',
    cache: { read: readCache, write: writeCache },
  })
}
