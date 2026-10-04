import { ApiKeysPanel, useOrg, useSession } from '@b2b-template/ui-web'
import { useTranslation } from 'react-i18next'

/**
 * The person's own personal access tokens in the org they are in: each
 * granted some of their own permissions, and checked against what they may
 * do at every use. Any member may make one, if the org's plan includes API
 * access; the identity service says when it does not.
 */
export default function TokensPage() {
  const { t } = useTranslation('account')
  const org = useOrg()
  const { permissions } = useSession()
  if (!org) return null
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('tokens.title')}</h1>
      <p className="max-w-3xl text-sm">{t('tokens.intro')}</p>
      <ApiKeysPanel
        api={org.api}
        orgId={org.orgId}
        kind="personal"
        can={(group) => permissions.can(group)}
      />
    </div>
  )
}
