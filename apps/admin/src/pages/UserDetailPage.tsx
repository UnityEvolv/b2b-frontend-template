import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Select,
  Spinner,
  toast,
} from '@unityevolv/unitykit'
import type { audit, identity, user } from '@b2b-template/api'
import { ORG_ROLES, useOrg, useSession } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

type Membership = user.components['schemas']['Membership']
type Session = identity.components['schemas']['Session']
type Event = audit.components['schemas']['AuditEvent']

/**
 * One person in the organization: what their directory says,
 * their role, their status, their second factor and sessions, and what
 * happened to them lately. Every refusal the server gives is shown with
 * its reason, the last Owner above all.
 */
export default function UserDetailPage() {
  const { t, i18n } = useTranslation('admin')
  const { membershipId = '' } = useParams()
  const org = useOrg()
  // The log is for whoever holds the audit permission; for anyone else the
  // activity card is not shown rather than shown empty.
  const canAudit = useSession().permissions.can('audit')
  const [member, setMember] = useState<Membership | null>(null)
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [events, setEvents] = useState<Event[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [confirmMfa, setConfirmMfa] = useState(false)

  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)
  const orgId = org?.orgId
  const api = org?.api

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void (async () => {
      const { data } = await api.user.GET(
        '/v1/organizations/{org_id}/memberships/{membership_id}',
        {
          params: { path: { org_id: orgId, membership_id: membershipId } },
        },
      )
      if (!current) return
      if (!data) {
        setMissing(true)
        return
      }
      setMember(data)
      const [s, e] = await Promise.all([
        api.identity.GET('/v1/organizations/{org_id}/members/{user_id}/sessions', {
          params: { path: { org_id: orgId, user_id: data.user.id } },
        }),
        api.audit.GET('/v1/organizations/{org_id}/audit-events', {
          params: { path: { org_id: orgId }, query: { target_id: membershipId, limit: 20 } },
        }),
      ])
      if (!current) return
      setSessions(s.data?.sessions ?? [])
      setEvents(e.data?.events ?? [])
    })()
    return () => {
      current = false
    }
  }, [api, orgId, membershipId, version])

  if (!org) return <EmptyState icon="users" titleAs="h2" title={t('users.empty')} />
  if (missing) return <EmptyState icon="search" titleAs="h2" title={t('detail.missing')} />
  if (!member) return <Spinner block size="lg" label={t('detail.loading')} />

  const isOwner = org.role === 'owner'
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  /** The server's reason, in its own words; the codes are stable, the message is for people. */
  const refused = (err: { code?: string; message?: string } | undefined) => {
    setRefusal(err?.message ?? t('detail.failed'))
  }

  const changeRole = async (role: string) => {
    setRefusal(null)
    const { error } = await org.api.authorization.PUT(
      '/v1/organizations/{org_id}/memberships/{membership_id}/role',
      {
        params: { path: { org_id: org.orgId, membership_id: member.id } },
        body: { role: role as never },
      },
    )
    if (error) return refused(error as never)
    toast.success(t('detail.roleChanged'))
    reload()
  }

  const changeStatus = async (status: 'active' | 'deactivated') => {
    setRefusal(null)
    const { error } = await org.api.user.PUT(
      '/v1/organizations/{org_id}/memberships/{membership_id}/status',
      {
        params: { path: { org_id: org.orgId, membership_id: member.id } },
        body: { status },
      },
    )
    if (error) return refused(error as never)
    toast.success(t(status === 'active' ? 'detail.reactivated' : 'detail.deactivated'))
    reload()
  }

  const resetMfa = async () => {
    setConfirmMfa(false)
    setRefusal(null)
    const { error } = await org.api.identity.DELETE(
      '/v1/organizations/{org_id}/members/{user_id}/mfa',
      {
        params: { path: { org_id: org.orgId, user_id: member.user.id } },
      },
    )
    if (error) return refused(error as never)
    toast.success(t('detail.mfaReset'))
    reload()
  }

  const signOutEverywhere = async () => {
    setRefusal(null)
    const { error } = await org.api.identity.DELETE(
      '/v1/organizations/{org_id}/members/{user_id}/sessions',
      {
        params: { path: { org_id: org.orgId, user_id: member.user.id } },
      },
    )
    if (error) return refused(error as never)
    toast.success(t('detail.signedOut'))
    reload()
  }

  const directory = member.directory
  const attributes: [string, string | undefined][] = [
    ['email', member.user.email],
    ['jobTitle', directory.job_title],
    ['department', directory.department],
    ['manager', directory.manager],
    ['location', directory.location],
  ]

  return (
    <>
      <Link to="/users" className="link mb-4 inline-block text-sm">
        {t('detail.back')}
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{member.user.name}</h1>
        {member.kind === 'guest' && <Badge variant="secondary">{t('users.guest')}</Badge>}
        <Badge variant={member.status === 'active' ? 'primary' : 'danger'}>
          {t(`users.status.${member.status}` as never)}
        </Badge>
      </div>
      {refusal && (
        <Alert variant="warn" className="mb-4">
          {refusal}
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card header={t('detail.directory')}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {attributes.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-base-content/70">{t(`detail.fields.${key}` as never)}</dt>
                <dd>{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card header={t('detail.access')}>
          <div className="space-y-4">
            <Select
              label={t('users.columns.role')}
              help={isOwner ? undefined : t('detail.ownerOnly')}
              value={member.role}
              disabled={!isOwner || member.kind === 'guest'}
              onChange={(event) => void changeRole(event.target.value)}
            >
              {ORG_ROLES.map((r) => (
                <option key={r} value={r} disabled={r === 'owner' || r === 'guest'}>
                  {t(`roles.${r}` as never, { ns: 'common' })}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2">
              {member.status === 'active' ? (
                <Button variant="danger" onClick={() => void changeStatus('deactivated')}>
                  {t('detail.deactivate')}
                </Button>
              ) : (
                <Button onClick={() => void changeStatus('active')}>
                  {t('detail.reactivate')}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setConfirmMfa(true)}>
                {t('detail.resetMfa')}
              </Button>
            </div>
          </div>
        </Card>
        <Card header={t('detail.sessions')}>
          {sessions === null ? (
            <Spinner label={t('detail.loading')} />
          ) : sessions.length === 0 ? (
            <p className="text-sm">{t('detail.noSessions')}</p>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-1 text-sm">
                {sessions.map((s) => (
                  <li key={s.session_id}>
                    {s.user_agent ?? t('detail.unknownDevice')} ·{' '}
                    {t('detail.lastSeen', { when: date.format(new Date(s.last_seen_at)) })}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" onClick={() => void signOutEverywhere()}>
                {t('detail.signOutEverywhere')}
              </Button>
            </div>
          )}
        </Card>
        {canAudit && (
          <Card header={t('detail.activity')}>
            {events === null ? (
              <Spinner label={t('detail.loading')} />
            ) : events.length === 0 ? (
              <p className="text-sm">{t('detail.noActivity')}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {events.map((e) => (
                  <li key={e.id}>
                    {date.format(new Date(e.occurred_at))} · <code>{e.action}</code>
                  </li>
                ))}
              </ul>
            )}
            <Link
              className="link mt-2 inline-block text-sm"
              to={`/audit?target_type=membership&target_id=${member.id}`}
            >
              {t('detail.fullHistory')}
            </Link>
          </Card>
        )}
      </div>
      <Modal
        open={confirmMfa}
        onOpenChange={setConfirmMfa}
        title={t('detail.resetMfaTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmMfa(false)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button variant="danger" onClick={() => void resetMfa()}>
              {t('detail.resetMfa')}
            </Button>
          </>
        }
      >
        {t('detail.resetMfaWarning', { name: member.user.name })}
      </Modal>
    </>
  )
}
