import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Select,
  Spinner,
  Table,
  Toggle,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { user } from '@b2b-template/api'
import { useOrg, useReadOnly } from '@b2b-template/ui-web'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  CONSENT_DURATIONS,
  grantState,
  memberName,
  validDuration,
  type Grant,
  type Impersonation,
  type SupportAccess,
} from './support'

type Membership = user.components['schemas']['Membership']

const reason = (error: unknown, fallback: string) =>
  (error as { message?: string } | undefined)?.message ?? fallback

/**
 * Support access: whether the platform's support staff may see the
 * organization as one of its people, read-only, to troubleshoot
 * (docs/impersonation.md). Anyone with the settings permission sees it;
 * only an Owner gives a consent, withdraws one, turns standing access on or
 * off, or ends a support session, as the identity service rules it. Every
 * request a support session makes is in the audit log.
 */
export default function SupportAccessPage() {
  const { t, i18n } = useTranslation('admin')
  const org = useOrg()
  const readOnly = useReadOnly()
  const [access, setAccess] = useState<SupportAccess | null>(null)
  const [grants, setGrants] = useState<Grant[] | null>(null)
  const [sessions, setSessions] = useState<Impersonation[] | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  // When the lists were read: what is open is judged against that moment.
  const [readAt, setReadAt] = useState(0)
  const [failed, setFailed] = useState(false)
  const [minutes, setMinutes] = useState<number>(60)
  const [includeOwners, setIncludeOwners] = useState(false)
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const api = org?.api
  const orgId = org?.orgId

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    const path = { params: { path: { org_id: orgId } } }
    void Promise.all([
      api.identity.GET('/v1/organizations/{org_id}/support-access', path),
      api.identity.GET('/v1/organizations/{org_id}/impersonation-grants', path),
      api.identity.GET('/v1/organizations/{org_id}/impersonations', path),
      api.user.GET('/v1/organizations/{org_id}/memberships', {
        params: { path: { org_id: orgId }, query: { limit: 200 } },
      }),
    ]).then(([a, g, s, m]) => {
      if (!current) return
      setReadAt(Date.now())
      setFailed(!a.data || !g.data || !s.data)
      setAccess(a.data ?? null)
      setGrants(g.data?.grants ?? [])
      setSessions(s.data?.impersonations ?? [])
      setMembers(m.data?.memberships ?? [])
    })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  if (!org) return null
  if (failed) return <Alert variant="danger">{t('supportAccess.failed')}</Alert>
  if (!access || !grants || !sessions) {
    return <Spinner block size="lg" label={t('detail.loading')} />
  }

  // The Owner's alone, and never in a support session.
  const owner = org.role === 'owner'
  const canChange = owner && !readOnly
  const path = { params: { path: { org_id: org.orgId } } }
  const now = readAt
  const dateTime = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const when = (at: string) => dateTime.format(new Date(at))

  const setStanding = async (next: { standing: boolean; include_owners: boolean }) => {
    setBusy(true)
    const { data, error } = await org.api.identity.PUT(
      '/v1/organizations/{org_id}/support-access',
      { ...path, body: next },
    )
    setBusy(false)
    if (!data) return toast.error(reason(error, t('supportAccess.saveFailed')))
    setAccess(data)
    toast.success(
      t(data.standing ? 'supportAccess.standingOnSaved' : 'supportAccess.standingOffSaved'),
    )
    reload()
  }

  const consent = async (event: FormEvent) => {
    event.preventDefault()
    if (!validDuration(minutes)) return
    setBusy(true)
    const { data, error } = await org.api.identity.POST(
      '/v1/organizations/{org_id}/impersonation-grants',
      { ...path, body: { duration_minutes: minutes, include_owners: includeOwners } },
    )
    setBusy(false)
    if (!data) return toast.error(reason(error, t('supportAccess.consentFailed')))
    toast.success(t('supportAccess.consented', { until: when(data.expires_at) }))
    setIncludeOwners(false)
    reload()
  }

  const withdraw = async (grant: Grant) => {
    const { error, response } = await org.api.identity.DELETE(
      '/v1/organizations/{org_id}/impersonation-grants/{grant_id}',
      { params: { path: { org_id: org.orgId, grant_id: grant.id } } },
    )
    if (!response.ok) return toast.error(reason(error, t('supportAccess.withdrawFailed')))
    toast.success(t('supportAccess.withdrawn'))
    reload()
  }

  const endNow = async (session: Impersonation) => {
    const { error, response } = await org.api.identity.DELETE(
      '/v1/organizations/{org_id}/impersonations/{impersonation_id}',
      { params: { path: { org_id: org.orgId, impersonation_id: session.id } } },
    )
    if (!response.ok) return toast.error(reason(error, t('supportAccess.endFailed')))
    toast.success(t('supportAccess.endedNow'))
    reload()
  }

  const grantColumns: TableColumn<Grant>[] = [
    {
      key: 'created_at',
      header: t('supportAccess.given'),
      card: 'title',
      cell: (g) => when(g.created_at),
    },
    { key: 'by', header: t('supportAccess.by'), cell: (g) => memberName(members, g.granted_by) },
    { key: 'until', header: t('supportAccess.until'), cell: (g) => when(g.expires_at) },
    {
      key: 'owners',
      header: t('supportAccess.owners'),
      cell: (g) => (g.include_owners ? t('supportAccess.ownersIn') : t('supportAccess.ownersOut')),
    },
    {
      key: 'state',
      header: t('supportAccess.state'),
      cell: (g) => {
        const state = grantState(g, now)
        return (
          <Badge variant={state === 'open' ? 'primary' : 'secondary'}>
            {t(`supportAccess.grantStates.${state}`)}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: t('supportAccess.actions'),
      cell: (g) =>
        canChange && grantState(g, now) === 'open' ? (
          <Button
            size="sm"
            variant="danger"
            aria-label={t('supportAccess.withdrawOne', { until: when(g.expires_at) })}
            onClick={() => void withdraw(g)}
          >
            {t('supportAccess.withdraw')}
          </Button>
        ) : null,
    },
  ]

  const sessionColumns: TableColumn<Impersonation>[] = [
    {
      key: 'started_at',
      header: t('supportAccess.started'),
      card: 'title',
      cell: (s) => when(s.started_at),
    },
    {
      key: 'person',
      header: t('supportAccess.person'),
      cell: (s) => memberName(members, s.user_id),
    },
    {
      key: 'under',
      header: t('supportAccess.under'),
      cell: (s) =>
        s.grant_id ? t('supportAccess.underConsent') : t('supportAccess.underStanding'),
    },
    {
      key: 'state',
      header: t('supportAccess.state'),
      cell: (s) =>
        s.active ? (
          <Badge variant="primary">
            {t('supportAccess.activeUntil', { until: when(s.ends_at) })}
          </Badge>
        ) : (
          t('supportAccess.endedAt', { when: when(s.ended_at ?? s.ends_at) })
        ),
    },
    {
      key: 'actions',
      header: t('supportAccess.actions'),
      cell: (s) =>
        canChange && s.active ? (
          <Button
            size="sm"
            variant="danger"
            aria-label={t('supportAccess.endOne', { person: memberName(members, s.user_id) })}
            onClick={() => void endNow(s)}
          >
            {t('supportAccess.end')}
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('supportAccess.title')}</h1>
      <p className="max-w-2xl text-sm">{t('supportAccess.intro')}</p>
      {!owner && <Alert variant="info">{t('supportAccess.ownerOnly')}</Alert>}

      <Card header={t('supportAccess.standing')}>
        <div className="space-y-3">
          <p className="text-sm">{t('supportAccess.standingHelp')}</p>
          <Toggle
            label={t('supportAccess.standingLabel')}
            checked={access.standing}
            disabled={!canChange || busy}
            onChange={(e) =>
              void setStanding({
                standing: e.target.checked,
                include_owners: e.target.checked ? access.include_owners : false,
              })
            }
          />
          <Toggle
            label={t('supportAccess.includeOwners')}
            help={t('supportAccess.includeOwnersHelp')}
            checked={access.include_owners}
            disabled={!canChange || busy || !access.standing}
            onChange={(e) => void setStanding({ standing: true, include_owners: e.target.checked })}
          />
        </div>
      </Card>

      <Card header={t('supportAccess.consentTitle')}>
        <p className="mb-3 text-sm">{t('supportAccess.consentHelp')}</p>
        {canChange && (
          <form onSubmit={consent} noValidate className="mb-4 flex flex-wrap items-end gap-3">
            <Select
              label={t('supportAccess.duration')}
              value={String(minutes)}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {CONSENT_DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m < 60
                    ? t('supportAccess.minutes', { count: m })
                    : t('supportAccess.hours', { count: m / 60 })}
                </option>
              ))}
            </Select>
            <Checkbox
              label={t('supportAccess.consentIncludesOwners')}
              checked={includeOwners}
              onChange={(e) => setIncludeOwners(e.target.checked)}
            />
            <Button type="submit" disabled={busy || !validDuration(minutes)}>
              {t('supportAccess.give')}
            </Button>
          </form>
        )}
        <Table
          caption={t('supportAccess.consents')}
          columns={grantColumns}
          rows={grants}
          rowKey={(g) => g.id}
          empty={t('supportAccess.noConsents')}
        />
      </Card>

      <Card header={t('supportAccess.sessions')}>
        <p className="mb-3 text-sm">
          {t('supportAccess.sessionsHelp')}{' '}
          <Link to="/audit" className="link">
            {t('supportAccess.auditLink')}
          </Link>
        </p>
        <Table
          caption={t('supportAccess.sessions')}
          columns={sessionColumns}
          rows={sessions}
          rowKey={(s) => s.id}
          empty={t('supportAccess.noSessions')}
        />
      </Card>
    </div>
  )
}
