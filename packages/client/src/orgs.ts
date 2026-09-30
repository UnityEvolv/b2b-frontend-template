import type { OrgChoice } from './auth'

/**
 * Moving between organizations and leaving one: the
 * rules web and the phone show the same way. The server enforces each of
 * them on its own; these only decide what to offer and what to say.
 */

/** The switcher is shown only when there is somewhere else to go. */
export function canSwitch(choices: readonly OrgChoice[]): boolean {
  return choices.length > 1
}

/** Why leaving is not offered, or null when it is. */
export function leaveBlocked(role: string): 'owner' | null {
  // An Owner transfers ownership first; the service refuses them anyway.
  return role === 'owner' ? 'owner' : null
}

/**
 * Where the session goes after leaving: signed out when nothing is left,
 * else into another organization the person still belongs to.
 */
export function afterLeaving(
  remaining: number,
  choices: readonly OrgChoice[],
  left: string,
): { kind: 'signed-out' } | { kind: 'switch'; orgId: string } | { kind: 'choose' } {
  if (remaining <= 0) return { kind: 'signed-out' }
  const next = choices.filter((c) => c.orgId !== left)
  if (next.length === 1) return { kind: 'switch', orgId: next[0]!.orgId }
  return { kind: 'choose' }
}
