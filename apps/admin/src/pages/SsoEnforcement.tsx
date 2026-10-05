import { Alert, Button, Card, Modal, Toggle, toast } from '@unityevolv/unitykit'
import type { identity } from '@b2b-template/api'
import { useOrg, useSession } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { refusal } from './identity-provider-parts'

type Provider = identity.components['schemas']['IdentityProvider']

/** The refusals the enforcement switch explains (`settings.enforcement.errors.*`). */
type Refusal = 'notVerified' | 'notConfigured' | 'forbidden' | 'failed'
const ERRORS: Readonly<Record<string, Refusal>> = {
  'identity_provider.not_verified': 'notVerified',
  'identity_provider.not_configured': 'notConfigured',
}

/**
 * Whether a provider may be required: active and verified. A SAML provider
 * is verified by its first sign-in; an OpenID one by the test before it was
 * saved.
 */
export const verified = (provider: Provider) =>
  provider.status === 'active' && Boolean(provider.verified_at)

/**
 * Require single sign-on for the organization's proven domain: a password
 * sign-in for an address in it is then refused (`sso.required`), except an
 * Owner's with a second factor (break glass). The Owner's alone, so anyone
 * else sees it switched off with the reason; the identity service refuses
 * them on its own. It can be turned on only while the provider is verified
 * (409 `identity_provider.not_verified` otherwise); turning it off is
 * always offered.
 */
export function SsoEnforcement({
  provider,
  onChange,
}: {
  provider: Provider
  onChange: (provider: Provider) => void
}) {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const settings = useSession().permissions.can('settings')
  const api = org?.api
  const orgId = org?.orgId
  const owner = org?.role === 'owner'
  const [domain, setDomain] = useState<string | null>(null)
  const [asking, setAsking] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  // The domain is the organization service's, read with the settings permission.
  useEffect(() => {
    if (!api || !orgId || !settings) return
    let current = true
    void api.organization
      .GET('/v1/organizations/{org_id}/domain', { params: { path: { org_id: orgId } } })
      .then(({ data }) => current && setDomain(data?.verified && data.domain ? data.domain : null))
    return () => {
      current = false
    }
  }, [api, orgId, settings])

  if (!org) return null
  const name = domain ?? t('settings.enforcement.yourDomain')
  const ready = verified(provider)
  const disabled = !owner || busy || (!ready && !provider.sso_enforced)

  const set = async (enforced: boolean) => {
    setBusy(true)
    setProblem(null)
    const { data, error, response } = await org.api.identity.PUT(
      '/v1/organizations/{org_id}/identity-provider/enforcement',
      { params: { path: { org_id: org.orgId } }, body: { enforced } },
    )
    setBusy(false)
    setAsking(null)
    if (!data) {
      const r = refusal(error)
      const key: Refusal =
        (r.code && ERRORS[r.code]) || (response.status === 403 ? 'forbidden' : 'failed')
      setProblem(t(`settings.enforcement.errors.${key}`))
      return
    }
    toast.success(enforced ? t('settings.enforcement.on') : t('settings.enforcement.off'))
    onChange(data)
  }

  const confirm = asking ? 'confirmOn' : 'confirmOff'
  return (
    <Card header={t('settings.enforcement.title')}>
      <div className="space-y-3 text-sm">
        <Toggle
          label={t('settings.enforcement.label', { domain: name })}
          help={
            !owner
              ? t('settings.enforcement.ownerOnly')
              : !ready && !provider.sso_enforced
                ? t('settings.enforcement.notVerified')
                : t('settings.enforcement.explain', { domain: name })
          }
          checked={provider.sso_enforced}
          disabled={disabled}
          onChange={(e) => setAsking(e.target.checked)}
        />
        {provider.sso_enforced && (
          <Alert variant={provider.sso_enforcement_active ? 'info' : 'warn'}>
            {provider.sso_enforcement_active
              ? t('settings.enforcement.inForce')
              : t('settings.enforcement.waiting')}
          </Alert>
        )}
        <p className="text-base-content/70">{t('settings.enforcement.breakGlass')}</p>
        {problem && <Alert variant="danger">{problem}</Alert>}
      </div>
      <Modal
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        dismissible={!busy}
        title={t(`settings.enforcement.${confirm}.title`, { domain: name })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsking(null)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              variant={asking ? 'danger' : 'primary'}
              disabled={busy}
              onClick={() => void set(Boolean(asking))}
            >
              {t(`settings.enforcement.${confirm}.go`)}
            </Button>
          </>
        }
      >
        <p className="text-sm">{t(`settings.enforcement.${confirm}.body`, { domain: name })}</p>
      </Modal>
    </Card>
  )
}
