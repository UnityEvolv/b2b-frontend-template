import { Alert, Button, Card, Input, Select } from '@unityevolv/unitykit'
import type { organization } from '@b2b-template/api'
import { useApp } from '@b2b-template/ui-web'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { looksLikeEmail, normalizeDomain } from './organizations'

type Organization = organization.components['schemas']['Organization']
type Fields = Partial<Record<'name' | 'domain' | 'email' | 'time_zone', string>>

const message = (error: unknown) => (error as { message?: string } | undefined)?.message
const serverFields = (error: unknown) =>
  ((error as { fields?: Record<string, string> } | undefined)?.fields ?? {}) as Fields

/** The zones the browser knows, so the choice is always an IANA name. */
function timeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  return intl.supportedValuesOf?.('timeZone') ?? ['UTC']
}

/**
 * Sales-led creation: the org, then an invite for its first Owner.
 * Each step carries an idempotency key made once per form, so a retried
 * submit never makes a second org or a second invite. When the org is made
 * but the invite fails, the page says so and retries only the invite.
 */
export default function CreateOrganizationPage() {
  const { t } = useTranslation('platform')
  const { auth } = useApp()
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [email, setEmail] = useState('')
  const [fields, setFields] = useState<Fields>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Organization | null>(null)
  const [invited, setInvited] = useState(false)
  // One key per form: a retry of the same submit is the same request.
  const [keys] = useState(() => ({ org: crypto.randomUUID(), invite: crypto.randomUUID() }))
  const api = auth?.api

  const invite = async (org: Organization) => {
    if (!api) return
    const { error: failed } = await api.identity.POST('/v1/organizations/{org_id}/invites', {
      params: { path: { org_id: org.org_id }, header: { 'Idempotency-Key': keys.invite } },
      body: { email: email.trim(), role: 'owner', app: 'admin', expires_in_hours: 168 },
    })
    if (failed) {
      setFields(serverFields(failed))
      setError(message(failed) ?? t('create.inviteFailed'))
      return
    }
    setError(null)
    setInvited(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!api) return
    const found: Fields = {}
    const cleanDomain = normalizeDomain(domain)
    if (!name.trim()) found.name = t('create.nameRequired')
    if (cleanDomain === null) found.domain = t('create.domainInvalid')
    if (!looksLikeEmail(email)) found.email = t('create.emailInvalid')
    setFields(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    let org = created
    if (!org) {
      const { data, error: failed } = await api.organization.POST('/v1/organizations', {
        params: { header: { 'Idempotency-Key': keys.org } },
        body: {
          name: name.trim(),
          time_zone: timeZone,
          ...(cleanDomain ? { domain: cleanDomain } : {}),
        },
      })
      if (!data) {
        setBusy(false)
        setFields(serverFields(failed))
        setError(message(failed) ?? t('create.failed'))
        return
      }
      org = data
      setCreated(data)
    }
    await invite(org)
    setBusy(false)
  }

  if (created && invited) {
    return (
      <Card header={t('create.doneTitle')} className="max-w-xl">
        <p className="mb-4">{t('create.done', { name: created.name, email: email.trim() })}</p>
        <div className="flex gap-2">
          <Link to={`/organizations/${created.org_id}`} className="btn btn-primary">
            {t('create.open')}
          </Link>
          <Link to="/organizations" className="btn btn-ghost">
            {t('create.back')}
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t('create.title')}</h1>
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={(e) => void submit(e)} noValidate>
          {error && <Alert variant="danger">{error}</Alert>}
          {created && !invited && <Alert variant="warn">{t('create.createdNotInvited')}</Alert>}
          <Input
            label={t('create.name')}
            value={name}
            required
            maxLength={200}
            disabled={Boolean(created)}
            error={fields.name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label={t('create.domain')}
            help={t('create.domainHelp')}
            value={domain}
            disabled={Boolean(created)}
            error={fields.domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Select
            label={t('create.timeZone')}
            help={t('create.timeZoneHelp')}
            value={timeZone}
            disabled={Boolean(created)}
            error={fields.time_zone}
            onChange={(e) => setTimeZone(e.target.value)}
          >
            {timeZones().map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
          <Input
            type="email"
            label={t('create.ownerEmail')}
            help={t('create.ownerHelp')}
            value={email}
            required
            error={fields.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {created ? t('create.retryInvite') : t('create.submit')}
            </Button>
            <Link to="/organizations" className="btn btn-ghost">
              {t('create.cancel')}
            </Link>
          </div>
        </form>
      </Card>
    </>
  )
}
