import type { identity } from '@b2b-template/api'
import { SUPPORT_PARAM } from '@b2b-template/ui-web'

type Schemas = identity.components['schemas']
export type Grant = Schemas['ImpersonationGrant']
export type Standing = Schemas['SupportAccess']
export type Impersonation = Schemas['Impersonation']

/** How a support session may start: under a consent until it ends, or under standing access. */
export type WayIn = { kind: 'consent'; grantId: string; until: string } | { kind: 'standing' }

/**
 * Whether support may see as a member of `role` now, and under what, as the
 * identity service rules it (docs/impersonation.md in the backend): an open
 * consent, the one lasting longest, or else standing access; an Owner only
 * when the consent or the standing access includes Owners. Null when
 * nothing covers them. The server checks it all again on start.
 */
export function wayIn(
  role: string,
  grants: readonly Grant[],
  standing: Standing | undefined,
  now: number,
): WayIn | null {
  const owner = role === 'owner'
  const open = grants
    .filter((g) => g.active && Date.parse(g.expires_at) > now && (!owner || g.include_owners))
    .sort((a, b) => Date.parse(b.expires_at) - Date.parse(a.expires_at))
  const consent = open[0]
  if (consent) return { kind: 'consent', grantId: consent.id, until: consent.expires_at }
  if (standing?.standing && (!owner || standing.include_owners)) return { kind: 'standing' }
  return null
}

/** The roles the admin app admits; anyone else uses the account app. */
const ADMIN_ROLES = ['owner', 'admin', 'billing_admin']

/** The web app a person uses, where a support session as them opens. */
export function appFor(role: string): 'admin' | 'account' {
  return ADMIN_ROLES.includes(role) ? 'admin' : 'account'
}

/** The address a support tab opens at: the app's start, marked as a support tab. */
export function supportUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/?${SUPPORT_PARAM}=1`
}
