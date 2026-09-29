import type { identity } from '@b2b-template/api'

/** The apps, as this frontend names them. */
export type AuthApp = 'account' | 'admin' | 'platform'

/** The app names the identity service's contract accepts. */
export type IdentityApp = identity.components['schemas']['NewInvite']['app']

/**
 * The one place this frontend's app names meet the identity service's.
 *
 * TODO(identity app rename): the backend is renaming the member app from
 * `ofis` to `account`. Once the specs are re-synced and the generated
 * `IdentityApp` says `account`, the member app maps to itself here and
 * nothing else changes.
 */
const IDENTITY_APPS = {
  account: 'ofis',
  admin: 'admin',
  platform: 'platform',
} as const satisfies Record<AuthApp, IdentityApp>

/** The name the identity service knows an app by, for its emails and links. */
export function identityApp(app: AuthApp): IdentityApp {
  return IDENTITY_APPS[app]
}
