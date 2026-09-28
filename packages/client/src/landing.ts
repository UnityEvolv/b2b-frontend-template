import type { Session } from './session'

/**
 * Where a signed-in person lands (UO-107, UO-89): the same rules on web and
 * on the phone.
 *
 * Several organizations and none active yet: the chooser. Otherwise straight
 * back into the office they were last in, while it still exists and is open;
 * failing that, the org's offices to choose from. The last office is on the
 * membership, which the realtime service writes as they move, so it follows
 * the person to any device.
 */
export type Landing =
  { kind: 'choose-organization' } | { kind: 'office'; officeId: string } | { kind: 'offices' }

export interface LandingFacts {
  session: Pick<Session, 'membership' | 'chooseOrganization'>
  /** The org's offices, as listed. */
  offices: readonly { id: string; status?: string }[]
  /** From the membership; null when there is none. */
  lastOfficeId: string | null
  /** The person asked for the list, rather than being sent back. */
  choosing?: boolean
}

export function landing(facts: LandingFacts): Landing {
  if (!facts.session.membership) return { kind: 'choose-organization' }
  const last = facts.lastOfficeId
  if (
    !facts.choosing &&
    last &&
    facts.offices.some((o) => o.id === last && (o.status ?? 'active') === 'active')
  ) {
    return { kind: 'office', officeId: last }
  }
  return { kind: 'offices' }
}
