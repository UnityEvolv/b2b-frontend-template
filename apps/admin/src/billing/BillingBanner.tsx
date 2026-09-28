import { Alert, Button } from '@unityevolv/unitykit'
import { useOrg, useSession } from '@b2b-template/ui-web'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { daysUntil, useBilling } from './billing'

/**
 * The billing banners across the admin app (UO-171), for whoever holds the
 * billing permission: past due with the days left, a trial ending from day
 * 10, and a pending downgrade that can still be cancelled.
 */
export function BillingBanner() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const { permissions } = useSession()
  const { pathname } = useLocation()
  const allowed = permissions.can('billing')
  const { account, setAccount } = useBilling(org?.api, org?.orgId, allowed)

  if (!account || !org) return null
  const onPage = pathname.startsWith('/billing')
  const link = onPage ? null : (
    <Link to="/billing" className="link font-medium">
      {t('billing.banner.open')}
    </Link>
  )

  if (account.state === 'past_due') {
    return (
      <Alert variant="danger" className="mb-4">
        {t('billing.banner.pastDue', { count: account.grace_days_left ?? 0 })} {link}
      </Alert>
    )
  }
  if (
    account.state === 'trialing' &&
    account.trial_ends_at &&
    daysUntil(account.trial_ends_at) <= 4
  ) {
    return (
      <Alert variant="warn" className="mb-4">
        {t('billing.banner.trialEnding', { count: daysUntil(account.trial_ends_at) })} {link}
      </Alert>
    )
  }
  if (account.pending_band) {
    const cancel = async () => {
      const { data } = await org.api.billing.DELETE('/v1/organizations/{org_id}/billing/pending', {
        params: { path: { org_id: org.orgId } },
      })
      if (data) setAccount(data)
    }
    return (
      <Alert variant="info" className="mb-4">
        {t('billing.banner.pending', {
          band: t(`billing.bands.${account.pending_band}`),
          date: account.period_end ? new Date(account.period_end).toLocaleDateString() : '',
        })}{' '}
        <Button size="sm" variant="ghost" onClick={() => void cancel()}>
          {t('billing.banner.cancel')}
        </Button>
      </Alert>
    )
  }
  return null
}
