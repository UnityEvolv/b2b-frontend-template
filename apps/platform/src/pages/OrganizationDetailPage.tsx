import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Table,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { Api, audit, identity, organization, user } from '@b2b-template/api'
import { bandLabel, useApp, usePlanCatalogue } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { planChoices, type Plan } from './organizations'
import { PlanOverrides } from './PlanOverrides'
import { SupportSessions } from './SupportSessions'

type Organization = organization.components['schemas']['Organization']
type PlanChange = organization.components['schemas']['PlanChange']
type Membership = user.components['schemas']['Membership']
type AuditEvent = audit.components['schemas']['AuditEvent']
type Provider = identity.components['schemas']['IdentityProvider']

const message = (error: unknown) => (error as { message?: string } | undefined)?.message

/** Active members the plan counts: guests and the deactivated are not seats. */
async function countSeats(api: Api, orgId: string): Promise<number> {
  let count = 0
  let cursor: string | undefined
  // Ten pages of two hundred is past every capped band.
  for (let page = 0; page < 10; page++) {
    const { data } = await api.user.GET('/v1/organizations/{org_id}/memberships', {
      params: {
        path: { org_id: orgId },
        query: { status: 'active', limit: 200, ...(cursor ? { cursor } : {}) },
      },
    })
    if (!data) break
    count += data.memberships.filter((m) => m.kind !== 'guest').length
    cursor = data.next_cursor
    if (!cursor) break
  }
  return count
}

const AUDIT_MONTHS = [13, 24, 36, 60, 84]

/**
 * One organization, for a platform operator: what it is, how full
 * it is, its plan and status, and a read-only support view of its people
 * and recent activity. Reading it writes a support entry to the org's own
 * audit log (the organization service does that), so the customer sees
 * that staff looked. The plan, its overrides, retention and the status are
 * the only changes made here.
 */
export default function OrganizationDetailPage() {
  const { t, i18n } = useTranslation('platform')
  const { auth, appOrigins } = useApp()
  const { orgId = '' } = useParams()
  const [org, setOrg] = useState<Organization | null>(null)
  const [missing, setMissing] = useState(false)
  const [seats, setSeats] = useState<number | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [provider, setProvider] = useState<Provider | null | undefined>(undefined)
  const [draft, setDraft] = useState('')
  const [target, setTarget] = useState<Plan | ''>('')
  const [preview, setPreview] = useState<PlanChange | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const [audit, setAudit] = useState<number | null>(null)
  const api = auth?.api
  const catalogue = usePlanCatalogue(api)
  const label = (band: string) => bandLabel(catalogue, band)

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    const path = { org_id: orgId }
    void Promise.all([
      api.organization.GET('/v1/organizations/{org_id}', { params: { path } }),
      api.user.GET('/v1/organizations/{org_id}/memberships', {
        params: { path, query: { limit: 50, sort: 'name', order: 'asc' } },
      }),
      api.audit.GET('/v1/organizations/{org_id}/audit-events', {
        params: { path, query: { limit: 20 } },
      }),
      api.identity.GET('/v1/organizations/{org_id}/identity-provider', { params: { path } }),
      countSeats(api, orgId),
      api.organization.GET('/v1/organizations/{org_id}/retention', { params: { path } }),
    ]).then(([o, m, a, p, count, r]) => {
      if (!current) return
      setAudit(r.data?.audit_months ?? null)
      setMissing(!o.data)
      setOrg(o.data ?? null)
      setMembers(m.data?.memberships ?? [])
      setEvents(a.data?.events ?? [])
      setProvider(p.data ?? null)
      setSeats(count)
    })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  useEffect(() => {
    if (!api || !orgId || !target) return
    let current = true
    void api.organization
      .GET('/v1/organizations/{org_id}/plan-change', {
        params: { path: { org_id: orgId }, query: { plan: target } },
      })
      .then(({ data, error }) => {
        if (!current) return
        setPreview(data ?? null)
        if (!data) toast.error(message(error) ?? t('detail.planFailed'))
      })
    return () => {
      current = false
    }
  }, [api, orgId, target, t])

  if (missing) {
    return (
      <Alert variant="danger">
        {t('detail.missing')} <Link to="/organizations">{t('detail.back')}</Link>
      </Alert>
    )
  }
  if (!api || !org) return <Spinner block size="lg" label={t('detail.loading')} />

  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const dateTime = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const contacts = members.filter(
    (m) => m.status === 'active' && (m.role === 'owner' || m.role === 'admin'),
  )
  const reload = () => setVersion((v) => v + 1)

  const changePlan = async () => {
    if (!target) return
    setBusy(true)
    const { data, error } = await api.organization.PUT('/v1/organizations/{org_id}/plan', {
      params: { path: { org_id: org.org_id } },
      body: { plan: target },
    })
    setBusy(false)
    if (!data) {
      toast.error(message(error) ?? t('detail.planFailed'))
      return
    }
    toast.success(t('detail.planChanged', { plan: label(data.plan) }))
    setTarget('')
    setDraft('')
    setPreview(null)
    reload()
  }

  const setStatus = async (status: 'active' | 'suspended') => {
    setBusy(true)
    const { data, error } = await api.organization.PUT('/v1/organizations/{org_id}/status', {
      params: { path: { org_id: org.org_id } },
      body: { status, ...(status === 'suspended' ? { reason: reason.trim() } : {}) },
    })
    setBusy(false)
    if (!data) {
      toast.error(message(error) ?? t('detail.statusFailed'))
      return
    }
    toast.success(t(status === 'suspended' ? 'detail.suspended' : 'detail.reactivated'))
    setReason('')
    reload()
  }

  // Closing: the operator's reason stands in for the Owner typing
  // the name; the org is deleted 30 days on unless reopened.
  const close = async () => {
    setBusy(true)
    const { data, error } = await api.organization.POST('/v1/organizations/{org_id}/close', {
      params: { path: { org_id: org.org_id } },
      body: { confirm_name: org.name, reason: reason.trim() },
    })
    setBusy(false)
    if (!data) {
      toast.error(message(error) ?? t('detail.statusFailed'))
      return
    }
    toast.success(t('detail.closed'))
    setReason('')
    reload()
  }

  const setAuditMonths = async (months: number) => {
    const { data, error } = await api.organization.PUT('/v1/organizations/{org_id}/retention', {
      params: { path: { org_id: org.org_id } },
      body: { audit_months: months },
    })
    if (!data) {
      toast.error(message(error) ?? t('detail.retentionFailed'))
      return
    }
    setAudit(data.audit_months)
    toast.success(t('detail.retentionSaved'))
  }

  const memberColumns: TableColumn<Membership>[] = [
    {
      key: 'name',
      header: t('detail.members.name'),
      card: 'title',
      cell: (m) => (
        <span className="flex items-center gap-2">
          {m.user.name}
          {m.kind === 'guest' && <Badge variant="secondary">{t('detail.members.guest')}</Badge>}
        </span>
      ),
    },
    { key: 'email', header: t('detail.members.email'), cell: (m) => m.user.email },
    {
      key: 'role',
      header: t('detail.members.role'),
      cell: (m) => t(`roles.${m.role}` as never, { ns: 'common' }),
    },
    {
      key: 'status',
      header: t('detail.members.status'),
      cell: (m) => t(`memberStatuses.${m.status}`),
    },
  ]
  const eventColumns: TableColumn<AuditEvent>[] = [
    {
      key: 'occurred_at',
      header: t('detail.activity.when'),
      card: 'title',
      cell: (e) => dateTime.format(new Date(e.occurred_at)),
    },
    { key: 'action', header: t('detail.activity.action'), cell: (e) => e.action },
    { key: 'actor', header: t('detail.activity.actor'), cell: (e) => e.actor },
  ]

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <Badge variant={org.status === 'suspended' ? 'danger' : 'secondary'}>
          {t(`statuses.${org.status}`)}
        </Badge>
      </div>
      <p className="mb-6 max-w-2xl text-sm">{t('detail.supportNote')}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card header={t('detail.about')}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-medium">{t('detail.domain')}</dt>
            <dd>{org.domain ?? t('organizations.none')}</dd>
            <dt className="font-medium">{t('detail.created')}</dt>
            <dd>{date.format(new Date(org.created_at))}</dd>
            <dt className="font-medium">{t('detail.timeZone')}</dt>
            <dd>{org.time_zone}</dd>
            <dt className="font-medium">{t('detail.identity')}</dt>
            <dd>
              {provider === undefined
                ? t('detail.loading')
                : provider
                  ? t('detail.sso', {
                      issuer: provider.issuer,
                      status: t(`providerStatuses.${provider.status}`),
                    })
                  : t('detail.local')}
            </dd>
            <dt className="font-medium">{t('detail.seats')}</dt>
            <dd>
              {seats === null
                ? t('detail.loading')
                : org.user_cap
                  ? t('detail.seatsOfCap', { used: String(seats), cap: String(org.user_cap) })
                  : t('detail.seatsNoCap', { used: String(seats) })}
            </dd>
          </dl>
          <h2 className="mb-2 mt-6 font-semibold">{t('detail.contacts')}</h2>
          {contacts.length === 0 ? (
            <p className="text-sm">{t('detail.noContacts')}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {contacts.map((m) => (
                <li key={m.id}>
                  {t('detail.contact', {
                    name: m.user.name,
                    email: m.user.email,
                    role: t(`roles.${m.role}` as never, { ns: 'common' }),
                  })}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-6">
          <Card header={t('detail.plan')}>
            <p className="mb-4 text-sm">{t('detail.planNow', { plan: label(org.plan) })}</p>
            <div className="flex flex-wrap items-end gap-2">
              <Select
                label={t('detail.moveTo')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              >
                <option value="">{t('detail.choosePlan')}</option>
                {planChoices(catalogue, '')
                  .filter((b) => b.name !== org.plan)
                  .map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.contractual ? t('detail.contractual', { plan: b.label }) : b.label}
                    </option>
                  ))}
              </Select>
              <Button
                variant="secondary"
                disabled={!draft || draft === org.plan}
                onClick={() => {
                  setPreview(null)
                  setTarget(draft)
                }}
              >
                {t('detail.reviewPlan')}
              </Button>
            </div>
            {preview && (
              <div className="mt-4 space-y-3">
                {preview.consequences.length === 0 ? (
                  <Alert variant="info">{t('detail.nothingCloses')}</Alert>
                ) : (
                  <Alert variant="warn">
                    <p className="mb-2">{t('detail.checklist')}</p>
                    <ul className="list-disc pl-5">
                      {preview.consequences.map((c) => (
                        <li key={c.code}>{c.message}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                <Button disabled={busy} onClick={() => void changePlan()}>
                  {t('detail.confirmPlan', { plan: label(preview.to) })}
                </Button>
              </div>
            )}
          </Card>

          <PlanOverrides api={api} orgId={org.org_id} catalogue={catalogue} onChanged={reload} />

          <Card header={t('detail.status')}>
            {org.status === 'closing' ? (
              <div className="space-y-3">
                <Alert variant="danger">
                  {t('detail.closingUntil', {
                    when: org.purge_after ? dateTime.format(new Date(org.purge_after)) : '',
                  })}
                </Alert>
                <Button disabled={busy} onClick={() => void setStatus('active')}>
                  {t('detail.reopen')}
                </Button>
              </div>
            ) : org.status === 'suspended' ? (
              <div className="space-y-3">
                <Alert variant="warn">
                  {t('detail.suspendedSince', {
                    when: org.suspended_at ? dateTime.format(new Date(org.suspended_at)) : '',
                    reason: org.suspension_reason ?? '',
                  })}
                </Alert>
                <Button disabled={busy} onClick={() => void setStatus('active')}>
                  {t('detail.reactivate')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">{t('detail.suspendHelp')}</p>
                <Input
                  label={t('detail.reason')}
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  variant="danger"
                  disabled={busy || !reason.trim()}
                  onClick={() => void setStatus('suspended')}
                >
                  {t('detail.suspend')}
                </Button>
                <p className="text-sm">{t('detail.closeHelp')}</p>
                <Button
                  variant="danger"
                  disabled={busy || !reason.trim()}
                  onClick={() => void close()}
                >
                  {t('detail.close')}
                </Button>
              </div>
            )}
          </Card>

          <Card header={t('detail.retention')}>
            <p className="mb-3 text-sm">{t('detail.retentionHelp')}</p>
            <Select
              label={t('detail.auditMonths')}
              value={String(audit ?? 13)}
              disabled={!catalogue?.bands.find((b) => b.name === org.plan)?.contractual}
              onChange={(e) => void setAuditMonths(Number(e.target.value))}
            >
              {AUDIT_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {t('detail.months', { n: String(m) })}
                </option>
              ))}
            </Select>
          </Card>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-xl font-semibold">{t('detail.members.title')}</h2>
      <Table
        caption={t('detail.members.title')}
        columns={memberColumns}
        rows={members}
        rowKey={(m) => m.id}
      />

      <SupportSessions api={api} orgId={org.org_id} members={members} appOrigins={appOrigins} />

      <h2 className="mb-3 mt-8 text-xl font-semibold">{t('detail.activity.title')}</h2>
      <Table
        caption={t('detail.activity.title')}
        columns={eventColumns}
        rows={events}
        rowKey={(e) => e.id}
      />
    </>
  )
}
