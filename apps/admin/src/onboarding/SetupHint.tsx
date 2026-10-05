import { Alert } from '@unityevolv/unitykit'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { CORE_STEPS, type CoreStep } from './onboarding'

/**
 * A core page's empty state pointing at its setup step (docs/onboarding.md):
 * no invites yet, no identity provider, the lowest band, no verified
 * domain. It links to the step's page, so a hidden checklist still leaves
 * the way in; on that page already, to the part of it where the step is
 * done (the element with the step's id).
 */
export function SetupHint({ step, className }: { step: CoreStep; className?: string }) {
  const { t } = useTranslation('admin')
  const { pathname } = useLocation()
  const href = CORE_STEPS[step]
  const action = t(`onboarding.hints.${step}.action`)
  return (
    <Alert variant="info" className={className} title={t(`onboarding.hints.${step}.title`)}>
      {t(`onboarding.hints.${step}.body`)}{' '}
      {pathname === href ? (
        // The browser's own jump to the part of this page where it is done.
        <a href={`#${step}`} className="link font-medium">
          {action}
        </a>
      ) : (
        <Link to={href} className="link font-medium">
          {action}
        </Link>
      )}
    </Alert>
  )
}
