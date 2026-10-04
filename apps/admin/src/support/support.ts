import type { identity, user } from '@b2b-template/api'

type Schemas = identity.components['schemas']
export type SupportAccess = Schemas['SupportAccess']
export type Grant = Schemas['ImpersonationGrant']
export type Impersonation = Schemas['Impersonation']
type Membership = user.components['schemas']['Membership']

/**
 * How long a consent may last, in minutes: 15 minutes to 24 hours, as the
 * identity service accepts. The picker offers these; the server checks the
 * range on its own.
 */
export const CONSENT_DURATIONS = [15, 30, 60, 120, 240, 480, 720, 1440] as const
export const MIN_CONSENT_MINUTES = 15
export const MAX_CONSENT_MINUTES = 1440

/** Whether a number of minutes is a consent the identity service would accept. */
export function validDuration(minutes: number): boolean {
  return (
    Number.isInteger(minutes) && minutes >= MIN_CONSENT_MINUTES && minutes <= MAX_CONSENT_MINUTES
  )
}

/** A consent's state, for the list: open, withdrawn, or past its end. */
export function grantState(grant: Grant, now: number): 'open' | 'withdrawn' | 'ended' {
  if (grant.revoked_at) return 'withdrawn'
  if (!grant.active || Date.parse(grant.expires_at) <= now) return 'ended'
  return 'open'
}

/** Who an actor (`membership:<id>`) or a user id is, by the org's members; the id otherwise. */
export function memberName(members: readonly Membership[], who: string): string {
  const membership = /^membership:(.+)$/.exec(who)?.[1]
  const found = membership
    ? members.find((m) => m.id === membership)
    : members.find((m) => m.user.id === who)
  return found?.user.name ?? who
}
