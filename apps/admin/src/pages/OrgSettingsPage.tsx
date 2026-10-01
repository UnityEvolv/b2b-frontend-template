import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Select,
  Spinner,
  toast,
} from '@unityevolv/unitykit'
import type { identity, organization } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationDefaults } from './NotificationDefaults'
import { OrgDataSettings } from './OrgDataSettings'

type Org = organization.components['schemas']['Organization']
type Claim = organization.components['schemas']['DomainClaim']
type Policy = identity.components['schemas']['SessionPolicy']

const DAY = 24 * 60 * 60

/** Every IANA zone the browser knows, or the org's own when it knows none. */
function zones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return all.includes(current) ? all : [current, ...all]
}

/** Why a request was refused, in the server's words. */
const reason = (error: unknown, fallback: string) =>
  (error as { message?: string } | undefined)?.message ?? fallback

/**
 * The organization itself: its name, domain, time zone, whether a second
 * factor is required, and how long sessions last. Owner and Admin, through
 * the settings permission; the API refuses anyone else on its own. Single
 * sign-on has its own page, under the sso permission.
 */
export default function OrgSettingsPage() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const [record, setRecord] = useState<Org | null>(null)
  const [claim, setClaim] = useState<Claim | null>(null)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)
  const orgId = org?.orgId
  const api = org?.api

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [timeZone, setTimeZone] = useState('')
  const [domain, setDomain] = useState('')
  const [lifetimeDays, setLifetimeDays] = useState(90)
  const [idleDays, setIdleDays] = useState(14)
  const [mfaRequired, setMfaRequired] = useState(false)

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    const path = { params: { path: { org_id: orgId } } }
    void Promise.all([
      api.organization.GET('/v1/organizations/{org_id}', path),
      api.organization.GET('/v1/organizations/{org_id}/domain', path),
      api.identity.GET('/v1/organizations/{org_id}/session-policy', path),
    ]).then(([o, d, s]) => {
      if (!current) return
      if (o.data) {
        setRecord(o.data)
        setName(o.data.name)
        setDisplayName(o.data.display_name ?? '')
        setTimeZone(o.data.time_zone)
      }
      setClaim(d.data ?? null)
      if (s.data) {
        setPolicy(s.data)
        setLifetimeDays(Math.round(s.data.lifetime_seconds / DAY))
        setIdleDays(Math.round(s.data.idle_timeout_seconds / DAY))
        setMfaRequired(s.data.mfa_required)
      }
    })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  if (!org || !record || !policy) {
    return <Spinner block size="lg" label={t('detail.loading')} />
  }
  const path = { params: { path: { org_id: org.orgId } } }

  const saveGeneral = async (event: FormEvent) => {
    event.preventDefault()
    const { error } = await org.api.organization.PATCH('/v1/organizations/{org_id}', {
      ...path,
      body: { name: name.trim(), display_name: displayName.trim() || null, time_zone: timeZone },
    })
    if (error) return toast.error(reason(error, t('settings.failed')))
    toast.success(t('settings.saved'))
    reload()
  }

  const startClaim = async (event: FormEvent) => {
    event.preventDefault()
    const { error } = await org.api.organization.PUT('/v1/organizations/{org_id}/domain', {
      ...path,
      body: { domain: domain.trim() },
    })
    if (error) return toast.error(reason(error, t('settings.failed')))
    reload()
  }

  const verify = async () => {
    const { error } = await org.api.organization.POST(
      '/v1/organizations/{org_id}/domain/verify',
      path,
    )
    if (error) return toast.error(reason(error, t('settings.failed')))
    toast.success(t('settings.domain.verified'))
    reload()
  }

  const savePolicy = async (event: FormEvent) => {
    event.preventDefault()
    const { error } = await org.api.identity.PUT('/v1/organizations/{org_id}/session-policy', {
      ...path,
      body: {
        lifetime_seconds: lifetimeDays * DAY,
        idle_timeout_seconds: idleDays * DAY,
        mfa_required: mfaRequired,
      },
    })
    if (error) return toast.error(reason(error, t('settings.failed')))
    toast.success(t('settings.sessions.saved'))
    reload()
  }

  const limits = policy.limits
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t('settings.title')}</h1>
      <div className="grid max-w-3xl gap-6">
        <Card header={t('settings.general')}>
          <form onSubmit={saveGeneral} noValidate className="space-y-4">
            <Input
              label={t('settings.name')}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label={t('settings.displayName')}
              help={t('settings.displayNameHelp')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Select
              label={t('settings.timeZone')}
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
            >
              {zones(timeZone).map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
            <p className="text-sm text-base-content/70">{t('settings.timeZoneHelp')}</p>
            <Button type="submit" disabled={!name.trim()}>
              {t('settings.save')}
            </Button>
          </form>
        </Card>

        <Card header={t('settings.domain.title')}>
          {claim?.domain ? (
            <p className="flex items-center gap-2">
              {claim.domain} <Badge variant="primary">{t('settings.domain.verifiedBadge')}</Badge>
            </p>
          ) : claim?.pending_domain ? (
            <div className="space-y-3 text-sm">
              <p>{t('settings.domain.pending', { domain: claim.pending_domain })}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt>{t('settings.domain.recordName')}</dt>
                <dd>
                  <code className="break-all">{claim.txt_name}</code>
                </dd>
                <dt>{t('settings.domain.recordValue')}</dt>
                <dd>
                  <code className="break-all">{claim.txt_value}</code>
                </dd>
              </dl>
              <Button onClick={() => void verify()}>{t('settings.domain.verify')}</Button>
            </div>
          ) : (
            <form onSubmit={startClaim} noValidate className="space-y-3">
              <p className="text-sm">{t('settings.domain.none')}</p>
              <Input
                label={t('settings.domain.label')}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <Button type="submit" disabled={!domain.trim()}>
                {t('settings.domain.claim')}
              </Button>
            </form>
          )}
        </Card>

        <Card header={t('settings.sessions.title')}>
          <form onSubmit={savePolicy} noValidate className="space-y-4">
            <Alert variant="info">{t('settings.sessions.newOnly')}</Alert>
            <Input
              type="number"
              label={t('settings.sessions.lifetime')}
              help={t('settings.sessions.range', {
                min: String(Math.round(limits.min_lifetime_seconds / DAY)),
                max: String(Math.round(limits.max_lifetime_seconds / DAY)),
              })}
              min={Math.round(limits.min_lifetime_seconds / DAY)}
              max={Math.round(limits.max_lifetime_seconds / DAY)}
              value={lifetimeDays}
              onChange={(e) => setLifetimeDays(Number(e.target.value))}
            />
            <Input
              type="number"
              label={t('settings.sessions.idle')}
              help={t('settings.sessions.range', {
                min: '1',
                max: String(Math.round(limits.max_idle_timeout_seconds / DAY)),
              })}
              min={1}
              max={Math.round(limits.max_idle_timeout_seconds / DAY)}
              value={idleDays}
              onChange={(e) => setIdleDays(Number(e.target.value))}
            />
            <Checkbox
              label={t('settings.sessions.mfa')}
              help={t('settings.sessions.mfaHelp')}
              checked={mfaRequired}
              onChange={(e) => setMfaRequired(e.target.checked)}
            />
            <Button type="submit">{t('settings.save')}</Button>
          </form>
        </Card>

        <NotificationDefaults />

        <OrgDataSettings name={record?.name ?? ''} />
      </div>
    </>
  )
}
