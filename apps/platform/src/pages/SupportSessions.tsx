import {
  Alert,
  Badge,
  Button,
  Card,
  Spinner,
  Table,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { Api, user } from '@b2b-template/api'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { appFor, supportUrl, wayIn, type Grant, type Impersonation, type Standing } from './support'

type Membership = user.components['schemas']['Membership']

const message = (error: unknown) => (error as { message?: string } | undefined)?.message

/**
 * Support for one organization, for a platform operator: the consents its
 * Owners gave and its standing support access, each member with a way to
 * see as them, and the support sessions it has had.
 *
 * "View as" starts the support session (the identity service sets its own
 * cookie on the API host, apart from the operator's) and opens the app the
 * person uses in a new tab, marked `?support=1`; that tab refreshes the
 * support session itself. The token the start answers with is not kept:
 * this page never uses it, and nothing writes it anywhere.
 */
export function SupportSessions({
  api,
  orgId,
  members,
  appOrigins = {},
  now = Date.now,
}: {
  api: Api
  orgId: string
  members: readonly Membership[]
  appOrigins?: Readonly<Record<string, string>>
  now?: () => number
}) {
  const { t, i18n } = useTranslation('platform')
  const [grants, setGrants] = useState<Grant[] | null>(null)
  const [standing, setStanding] = useState<Standing | undefined>()
  const [sessions, setSessions] = useState<Impersonation[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let current = true
    void Promise.all([
      api.identity.GET('/v1/platform/impersonation-grants'),
      api.identity.GET('/v1/organizations/{org_id}/impersonations', {
        params: { path: { org_id: orgId } },
      }),
    ]).then(([usable, past]) => {
      if (!current) return
      setFailed(!usable.data)
      setGrants((usable.data?.grants ?? []).filter((g) => g.org_id === orgId))
      setStanding(usable.data?.standing.find((s) => s.org_id === orgId))
      setSessions(past.data?.impersonations ?? [])
    })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  const dateTime = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const when = (at: string) => dateTime.format(new Date(at))

  if (!grants || !sessions) {
    return (
      <Card header={t('support.title')}>
        <Spinner label={t('detail.loading')} />
      </Card>
    )
  }

  const nameOf = (userId: string) => members.find((m) => m.user.id === userId)?.user.name ?? userId
  const at = now()

  const viewAs = async (member: Membership) => {
    const way = wayIn(member.role, grants, standing, at)
    const origin = appOrigins[appFor(member.role)]
    if (!way || !origin) return
    setStarting(member.id)
    // Opened now, while the click still counts, so the browser does not
    // block it; pointed at the app once the session has started.
    const tab = window.open('about:blank', '_blank')
    if (tab) tab.opener = null
    const { data, error } = await api.identity.POST('/v1/platform/impersonations', {
      body: {
        org_id: orgId,
        user_id: member.user.id,
        ...(way.kind === 'consent' ? { grant_id: way.grantId } : {}),
      },
      // The support cookie is set on the API host, so the request carries credentials.
      credentials: 'include',
    })
    setStarting(null)
    if (!data) {
      tab?.close()
      toast.error(message(error) ?? t('support.startFailed'))
      reload()
      return
    }
    const url = supportUrl(origin)
    if (tab) tab.location.href = url
    else window.open(url, '_blank', 'noopener')
    toast.success(
      t('support.started', { name: member.user.name, until: when(data.impersonation.ends_at) }),
    )
    reload()
  }

  const active = members.filter((m) => m.status === 'active')
  const memberColumns: TableColumn<Membership>[] = [
    { key: 'name', header: t('support.member'), card: 'title', cell: (m) => m.user.name },
    {
      key: 'role',
      header: t('detail.members.role'),
      cell: (m) => t(`roles.${m.role}` as never, { ns: 'common' }),
    },
    {
      key: 'how',
      header: t('support.how'),
      cell: (m) => {
        const way = wayIn(m.role, grants, standing, at)
        if (!way) return m.role === 'owner' ? t('support.ownersNotIncluded') : t('support.noWay')
        return way.kind === 'consent'
          ? t('support.underConsent', { until: when(way.until) })
          : t('support.underStanding')
      },
    },
    {
      key: 'view',
      header: t('support.actions'),
      cell: (m) => {
        const way = wayIn(m.role, grants, standing, at)
        const app = appFor(m.role)
        const origin = appOrigins[app]
        return (
          <Button
            size="sm"
            variant="secondary"
            disabled={!way || !origin || starting !== null}
            loading={starting === m.id}
            aria-label={t('support.viewAsOne', {
              name: m.user.name,
              app: t(`support.apps.${app}`),
            })}
            title={!origin ? t('support.noOrigin', { app: t(`support.apps.${app}`) }) : undefined}
            onClick={() => void viewAs(m)}
          >
            {t('support.viewAs')}
          </Button>
        )
      },
    },
  ]

  const sessionColumns: TableColumn<Impersonation>[] = [
    {
      key: 'started_at',
      header: t('support.started_at'),
      card: 'title',
      cell: (s) => when(s.started_at),
    },
    { key: 'user', header: t('support.member'), cell: (s) => nameOf(s.user_id) },
    { key: 'operator', header: t('support.operator'), cell: (s) => s.impersonator_id },
    {
      key: 'under',
      header: t('support.under'),
      cell: (s) => (s.grant_id ? t('support.consent') : t('support.standing')),
    },
    {
      key: 'state',
      header: t('support.state'),
      cell: (s) =>
        s.active ? (
          <Badge variant="primary">{t('support.activeUntil', { until: when(s.ends_at) })}</Badge>
        ) : (
          t('support.endedAt', { when: when(s.ended_at ?? s.ends_at) })
        ),
    },
  ]

  const openGrants = grants.filter((g) => g.active)
  return (
    <section aria-labelledby="support-title" className="mt-8 space-y-4">
      <h2 id="support-title" className="text-xl font-semibold">
        {t('support.title')}
      </h2>
      <p className="max-w-2xl text-sm">{t('support.intro')}</p>
      {failed && <Alert variant="danger">{t('support.failed')}</Alert>}
      <Card header={t('support.access')}>
        <ul className="space-y-1 text-sm">
          <li>
            {standing?.standing
              ? standing.include_owners
                ? t('support.standingOnOwners')
                : t('support.standingOn')
              : t('support.standingOff')}
          </li>
          {openGrants.length === 0 ? (
            <li>{t('support.noConsent')}</li>
          ) : (
            openGrants.map((g) => (
              <li key={g.id}>
                {t(g.include_owners ? 'support.consentOwners' : 'support.consentOpen', {
                  until: when(g.expires_at),
                })}
              </li>
            ))
          )}
        </ul>
      </Card>
      <Table
        caption={t('support.members')}
        columns={memberColumns}
        rows={active}
        rowKey={(m) => m.id}
        empty={t('support.noMembers')}
      />
      <h3 className="text-lg font-semibold">{t('support.sessions')}</h3>
      <Table
        caption={t('support.sessions')}
        columns={sessionColumns}
        rows={sessions}
        rowKey={(s) => s.id}
        empty={t('support.noSessions')}
      />
    </section>
  )
}
