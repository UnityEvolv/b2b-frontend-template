import type { Api } from '@b2b-template/api'
import { useSession } from '@b2b-template/client'

import { auth } from './services'

export interface OrgContext {
  api: Api
  orgId: string
  membershipId: string
  role: string
  userId: string
}

/**
 * The typed API and the organization the session is active in, for a
 * screen inside one org. Null while the chooser is pending.
 */
export function useOrg(): OrgContext | null {
  const { state } = useSession()
  if (!auth || state.status !== 'signed-in' || !state.session.membership) return null
  const { orgId, membershipId, role } = state.session.membership
  return { api: auth.api, orgId, membershipId, role, userId: state.session.user.id }
}

/** The API's error message, when it sent one. */
export function apiMessage(error: unknown): string | undefined {
  const message = (error as { message?: unknown } | undefined)?.message
  return typeof message === 'string' && message !== '' ? message : undefined
}
