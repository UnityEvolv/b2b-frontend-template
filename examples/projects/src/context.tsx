import { Alert } from '@unityevolv/unitykit'
import { createContext, useContext, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { ProjectsApi, Refusal } from './api'

export interface ProjectsContextValue {
  /** The projects service, or null when the build names no address for it. */
  api: ProjectsApi | null
  /** Sends a cover to its signed upload URL: the browser's fetch, or a test's. */
  upload: typeof globalThis.fetch
  /** The admin app's billing page, where a plan refusal sends the person. */
  billingUrl?: string
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

/**
 * Put there by the app definition's `shell`, the template's seam for state
 * an app keeps across its pages.
 */
export function ProjectsProvider({
  value,
  children,
}: {
  value: ProjectsContextValue
  children: ReactNode
}) {
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects(): ProjectsContextValue {
  const value = useContext(ProjectsContext)
  if (!value) throw new Error('useProjects is used outside ProjectsProvider')
  return value
}

/** A refused change, in words: the plan's cap with a way to billing, or the permission. */
export function RefusalAlert({ refusal }: { refusal: Refusal | null }) {
  const { t } = useTranslation('projects')
  const { billingUrl } = useProjects()
  if (!refusal) return null
  if (refusal.kind === 'plan') {
    return (
      <Alert variant="warn" className="mb-4">
        <p>
          {t('plan.limitReached', { plan: refusal.plan, limit: refusal.limit })}{' '}
          {refusal.requiredPlan
            ? t('plan.upgrade', { required: refusal.requiredPlan })
            : t('plan.noHigher')}
        </p>
        {billingUrl && (
          <a className="link mt-1 inline-block" href={billingUrl}>
            {t('plan.billing')}
          </a>
        )}
      </Alert>
    )
  }
  return (
    <Alert variant="warn" className="mb-4">
      {refusal.kind === 'forbidden'
        ? t('errors.forbidden')
        : (refusal.error?.message ?? t('errors.failed'))}
    </Alert>
  )
}
