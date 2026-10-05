import { Alert, Badge, Button, Card, Icon, toast } from '@unityevolv/unitykit'
import { useAppLink, useOrg, useReadOnly, useSession } from '@b2b-template/ui-web'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  showChecklist,
  splitSteps,
  stepState,
  useOnboarding,
  type OnboardingStep,
} from './onboarding'

const reason = (error: unknown, fallback: string) =>
  (error as { message?: string } | undefined)?.message ?? fallback

/**
 * Where a step is done: a route here, the address in another web app, or
 * nothing when that app has no address in this build (the step is still
 * shown, without a link).
 */
function StepLink({ step }: { step: OnboardingStep }) {
  const { t } = useTranslation('admin')
  const link = useAppLink(step.app, step.href)
  const label = t('onboarding.go', { step: step.label })
  if (!link) return null
  if (link.kind === 'route') {
    return (
      <Link to={link.to} className="link text-sm" aria-label={label}>
        {t('onboarding.open')}
      </Link>
    )
  }
  return (
    <a href={link.href} className="link text-sm" aria-label={label}>
      {t('onboarding.open')}
    </a>
  )
}

/**
 * The organization's setup checklist, on the admin app's start page, for
 * whoever holds the settings permission (docs/onboarding.md). Every step,
 * the core's and the product's, comes from the organization service, each
 * derived from the org's data when it is read: done, not yet, or unknown
 * when the service that knows did not answer in time. A step can be hidden
 * and shown again, and the whole checklist hidden; it goes away by itself
 * once every step is done or hidden. Hiding is the org's, for every admin.
 */
export function OnboardingChecklist() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const { permissions } = useSession()
  const readOnly = useReadOnly()
  const allowed = permissions.can('settings')
  const { checklist, reload } = useOnboarding(org?.api, org?.orgId, allowed)
  const [busy, setBusy] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  if (!org || !allowed || !showChecklist(checklist)) return null

  const base = { org_id: org.orgId }
  const change = async (run: () => Promise<{ error?: unknown; response: Response }>) => {
    setBusy(true)
    const { error, response } = await run()
    setBusy(false)
    if (!response.ok) toast.error(reason(error, t('onboarding.failed')))
    reload()
  }
  const hideStep = (step: OnboardingStep) =>
    change(() =>
      org.api.organization.POST('/v1/organizations/{org_id}/onboarding/steps/{step_id}/dismissal', {
        params: { path: { ...base, step_id: step.id } },
      }),
    )
  const showStep = (step: OnboardingStep) =>
    change(() =>
      org.api.organization.DELETE(
        '/v1/organizations/{org_id}/onboarding/steps/{step_id}/dismissal',
        { params: { path: { ...base, step_id: step.id } } },
      ),
    )
  const hideAll = () =>
    change(() =>
      org.api.organization.POST('/v1/organizations/{org_id}/onboarding/dismissal', {
        params: { path: base },
      }),
    )

  const { shown, hidden } = splitSteps(checklist)
  const done = checklist.steps.filter((s) => s.done || s.dismissed).length
  const unknown = checklist.steps.some((s) => s.unknown)
  const locked = busy || readOnly

  return (
    <Card
      className="mb-6"
      header={<h2 className="text-lg font-semibold">{t('onboarding.title')}</h2>}
      aria-label={t('onboarding.title')}
    >
      <p className="mb-3 text-sm">
        {t('onboarding.progress', { done: String(done), total: String(checklist.steps.length) })}
      </p>
      <ul className="space-y-2" aria-label={t('onboarding.steps')}>
        {shown.map((step) => {
          const state = stepState(step)
          return (
            <li key={step.id} className="flex flex-wrap items-center gap-2">
              <Icon
                name={state === 'done' ? 'check' : state === 'unknown' ? 'alert' : 'clock'}
                size="sm"
              />
              <span className={state === 'done' ? 'line-through' : undefined}>{step.label}</span>
              <Badge variant={state === 'done' ? 'primary' : 'secondary'}>
                {t(`onboarding.states.${state}`)}
              </Badge>
              {state !== 'done' && <StepLink step={step} />}
              <Button
                size="sm"
                variant="ghost"
                disabled={locked}
                aria-label={t('onboarding.hideOne', { step: step.label })}
                onClick={() => void hideStep(step)}
              >
                {t('onboarding.hide')}
              </Button>
            </li>
          )
        })}
      </ul>
      {unknown && (
        <Alert variant="info" className="mt-3">
          {t('onboarding.unknown')}{' '}
          <Button size="sm" variant="ghost" onClick={reload}>
            {t('onboarding.checkAgain')}
          </Button>
        </Alert>
      )}
      {hidden.length > 0 && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={showHidden}
            onClick={() => setShowHidden((v) => !v)}
          >
            {t('onboarding.hiddenSteps', { count: hidden.length })}
          </Button>
          {showHidden && (
            <ul className="mt-2 space-y-2" aria-label={t('onboarding.hiddenList')}>
              {hidden.map((step) => (
                <li key={step.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{step.label}</span>
                  {step.done && <Badge variant="primary">{t('onboarding.states.done')}</Badge>}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={locked}
                    aria-label={t('onboarding.showOne', { step: step.label })}
                    onClick={() => void showStep(step)}
                  >
                    {t('onboarding.show')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="ghost" disabled={locked} onClick={() => void hideAll()}>
          {t('onboarding.hideAll')}
        </Button>
      </div>
    </Card>
  )
}

/**
 * On the settings page: the way back to a hidden checklist, while there is
 * still something on it.
 */
export function OnboardingRestore() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const { permissions } = useSession()
  const readOnly = useReadOnly()
  const allowed = permissions.can('settings')
  const { checklist, reload } = useOnboarding(org?.api, org?.orgId, allowed)
  const [busy, setBusy] = useState(false)
  if (!org || !checklist?.dismissed || checklist.complete) return null
  const restore = async () => {
    setBusy(true)
    const { error, response } = await org.api.organization.DELETE(
      '/v1/organizations/{org_id}/onboarding/dismissal',
      { params: { path: { org_id: org.orgId } } },
    )
    setBusy(false)
    if (!response.ok) return toast.error(reason(error, t('onboarding.failed')))
    toast.success(t('onboarding.restored'))
    reload()
  }
  return (
    <Card header={t('onboarding.title')}>
      <p className="mb-3 text-sm">{t('onboarding.hiddenAll')}</p>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy || readOnly}
        onClick={() => void restore()}
      >
        {t('onboarding.showAll')}
      </Button>
    </Card>
  )
}
