import type { Api, organization } from '@b2b-template/api'
import { useCallback, useEffect, useState } from 'react'

export type Onboarding = organization.components['schemas']['Onboarding']
export type OnboardingStep = organization.components['schemas']['OnboardingStep']

/**
 * The core's steps and where each is done in this app, as the organization
 * service registers them (docs/onboarding.md in the backend). The checklist
 * reads every step, the product's too, from the service; this table is only
 * for the core pages' empty states, which link to their step without
 * reading the checklist, so a dismissed checklist still leaves the way in.
 */
export const CORE_STEPS = {
  verify_domain: '/settings',
  invite_teammates: '/users/invite',
  set_up_sso: '/sso',
  choose_plan: '/billing',
} as const

export type CoreStep = keyof typeof CORE_STEPS

/** Whether the checklist is shown: not dismissed, and something is left to do or unknown. */
export function showChecklist(checklist: Onboarding | null): checklist is Onboarding {
  return !!checklist && !checklist.dismissed && !checklist.complete
}

/** The steps the checklist shows, and the ones an admin hid, in the server's order. */
export function splitSteps(checklist: Onboarding): {
  shown: OnboardingStep[]
  hidden: OnboardingStep[]
} {
  return {
    shown: checklist.steps.filter((s) => !s.dismissed),
    hidden: checklist.steps.filter((s) => s.dismissed),
  }
}

/** A step's state, for the words beside it: unknown is never done. */
export function stepState(step: OnboardingStep): 'done' | 'todo' | 'unknown' {
  if (step.unknown) return 'unknown'
  return step.done ? 'done' : 'todo'
}

/**
 * The org's checklist, read when the page opens and again after each
 * change; nothing is kept. Not asked for without the settings permission,
 * which the organization service checks on its own.
 */
export function useOnboarding(api: Api | undefined, orgId: string | undefined, allowed: boolean) {
  const [checklist, setChecklist] = useState<Onboarding | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!api || !orgId || !allowed) return
    let current = true
    void api.organization
      .GET('/v1/organizations/{org_id}/onboarding', { params: { path: { org_id: orgId } } })
      .then(({ data }) => {
        if (!current) return
        setFailed(!data)
        setChecklist(data ?? null)
      })
    return () => {
      current = false
    }
  }, [api, orgId, allowed, version])

  return { checklist, failed, reload }
}
