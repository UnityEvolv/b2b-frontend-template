import type { Api } from '@b2b-template/api'

import { useApp } from './app'
import { useSession } from './session'

export interface OrgContext {
  api: Api
  orgId: string
  membershipId: string
  role: string
}

/**
 * The typed API and the organization the session is active in, for a page
 * that works inside one org. Null for a development session or while the
 * chooser is pending; the page then shows nothing it cannot load.
 */
export function useOrg(): OrgContext | null {
  const { auth } = useApp()
  const { state } = useSession()
  if (!auth || state.status !== 'signed-in' || !state.session.membership) return null
  const { orgId, membershipId, role } = state.session.membership
  return { api: auth.api, orgId, membershipId, role }
}

/** The org id of the platform itself: its members are UnityEvolv staff. */
export const PLATFORM_ORG = '00000000-0000-7000-8000-000000000000'

/** The roles an inviter may hand out: an Owner any but Owner, an Admin only User. */
export function assignableRoles(role: string): string[] {
  if (role === 'owner') return ['admin', 'billing_admin', 'user']
  if (role === 'admin') return ['user']
  return []
}

/** Every org role, highest first: the keys the pages translate. */
export const ORG_ROLES = ['owner', 'admin', 'billing_admin', 'user', 'guest'] as const

/** Every membership status: the keys the pages translate. */
export const MEMBERSHIP_STATUSES = ['active', 'deactivated', 'suspended', 'left'] as const
