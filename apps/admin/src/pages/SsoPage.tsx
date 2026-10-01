import { useTranslation } from 'react-i18next'

import { IdentityProviderSettings } from './IdentityProviderSettings'

/**
 * Single sign-on: the organization's identity provider, tested and saved.
 * Its own page because the identity service asks for the sso permission
 * alone, which a role may hold without settings; the route asks the same.
 */
export default function SsoPage() {
  const { t } = useTranslation('admin')
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('sso.title')}</h1>
      <IdentityProviderSettings />
    </div>
  )
}
