import { ApiKeysPanel, useOrg, useSession } from '@b2b-template/ui-web'
import { useTranslation } from 'react-i18next'

/**
 * The org's API keys, for scripts: whoever holds api_keys (the route asks
 * for it, as the identity service does) sees every key and personal access
 * token in the org, makes a key with permissions they hold, and revokes any.
 * A plan refusal links to billing for whoever may change the plan.
 */
export default function ApiKeysPage() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const { permissions } = useSession()
  if (!org) return null
  // Billing is where the plan is changed, for whoever may change it.
  const billing = permissions.can('billing') ? { billingPath: '/billing' } : {}
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('apiKeys.title')}</h1>
      <p className="max-w-3xl text-sm">{t('apiKeys.intro')}</p>
      <ApiKeysPanel
        api={org.api}
        orgId={org.orgId}
        kind="org"
        can={(group) => permissions.can(group)}
        {...billing}
      />
    </div>
  )
}
