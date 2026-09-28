// Generated from specs/*.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

import type { paths as audit } from './audit.js'
import type { paths as authorization } from './authorization.js'
import type { paths as billing } from './billing.js'
import type { paths as identity } from './identity.js'
import type { paths as notification } from './notification.js'
import type { paths as organization } from './organization.js'
import type { paths as user } from './user.js'

/** Every backend service with a contract. */
export const serviceNames = [
  'audit',
  'authorization',
  'billing',
  'identity',
  'notification',
  'organization',
  'user',
] as const

/** Each service name to its paths. */
export interface Services {
  audit: audit
  authorization: authorization
  billing: billing
  identity: identity
  notification: notification
  organization: organization
  user: user
}

export type * as audit from './audit.js'
export type * as authorization from './authorization.js'
export type * as billing from './billing.js'
export type * as identity from './identity.js'
export type * as notification from './notification.js'
export type * as organization from './organization.js'
export type * as user from './user.js'
