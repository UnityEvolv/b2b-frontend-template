import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
  Table,
  Tabs,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import { DEFAULT_VARIABLES } from '@b2b-template/i18n'
import { useOrg } from '@b2b-template/ui-web'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  GUIDE_STEPS,
  PROVIDERS,
  SCIM_ACTOR,
  scimURL,
  type ScimGroup,
  type ScimLogEntry,
  type ScimSettings,
} from './scim'

type Api = NonNullable<ReturnType<typeof useOrg>>['api']

const message = (error: unknown) => (error as { message?: string } | undefined)?.message

/**
 * SCIM: the URL and token an identity provider needs, a guide per provider,
 * what the provider has been doing, the groups it has pushed, and any change
 * halted for a decision. Every plan can read it;
 * only Enterprise can turn it on, and the API refuses the same way.
 */
export default function ScimPage() {
  const { t, i18n } = useTranslation('admin')
  const org = useOrg()
  const api = org?.api
  const orgId = org?.orgId
  const [settings, setSettings] = useState<ScimSettings | null>(null)
  const [groups, setGroups] = useState<ScimGroup[]>([])
  const [log, setLog] = useState<ScimLogEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [secret, setSecret] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const names = useNames(api, orgId)

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    const path = { org_id: orgId }
    void Promise.all([
      api.user.GET('/v1/organizations/{org_id}/scim', { params: { path } }),
      api.user.GET('/v1/organizations/{org_id}/scim/groups', { params: { path } }),
      api.user.GET('/v1/organizations/{org_id}/scim/log', { params: { path } }),
    ]).then(([s, g, l]) => {
      if (!current) return
      setFailed(!s.data)
      setSettings(s.data ?? null)
      setGroups(g.data?.groups ?? [])
      setLog(l.data?.entries ?? [])
    })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  useEffect(() => {
    if (log) names.want(log.map((e) => e.membership_id))
  }, [log, names])

  if (!api || !orgId) return null
  if (failed) return <Alert variant="danger">{t('scim.failed')}</Alert>
  if (!settings) return <Spinner block size="lg" label={t('scim.loading')} />

  const reload = () => setVersion((v) => v + 1)
  const when = (at?: string) =>
    at
      ? new Date(at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
      : ''
  const url = scimURL(settings.base_url, import.meta.env.VITE_API_ORIGIN_USER)
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(t('scim.copied'))
  }

  const generate = async () => {
    const { data, error } = await api.user.POST('/v1/organizations/{org_id}/scim/tokens', {
      params: { path: { org_id: orgId } },
    })
    if (!data) {
      toast.error(message(error) ?? t('scim.actionFailed'))
      return
    }
    setSecret(data.token)
    reload()
  }

  const revoke = async (id: string) => {
    const { error } = await api.user.DELETE('/v1/organizations/{org_id}/scim/tokens/{token_id}', {
      params: { path: { org_id: orgId, token_id: id } },
    })
    if (error) toast.error(message(error) ?? t('scim.actionFailed'))
    else toast.success(t('scim.tokens.revoked'))
    reload()
  }

  const resolve = async (action: 'apply' | 'dismiss') => {
    const { data, error } = await api.user.POST('/v1/organizations/{org_id}/scim/halt', {
      params: { path: { org_id: orgId } },
      body: { action },
    })
    setReviewing(false)
    if (!data) {
      toast.error(message(error) ?? t('scim.actionFailed'))
      return
    }
    toast.success(t(`scim.halt.${action}Done`))
    reload()
  }

  type Token = ScimSettings['tokens'][number]
  const tokenColumns: TableColumn<Token>[] = [
    {
      key: 'prefix',
      header: t('scim.tokens.prefix'),
      card: 'title',
      cell: (k) => <code>{k.prefix}…</code>,
    },
    { key: 'created', header: t('scim.tokens.created'), cell: (k) => when(k.created_at) },
    {
      key: 'used',
      header: t('scim.tokens.used'),
      cell: (k) => (k.last_used_at ? when(k.last_used_at) : t('scim.tokens.never')),
    },
    {
      key: 'expires',
      header: t('scim.tokens.expires'),
      cell: (k) =>
        k.expires_at
          ? t('scim.tokens.until', { date: when(k.expires_at) })
          : t('scim.tokens.current'),
    },
    {
      key: 'revoke',
      header: t('scim.actions'),
      cell: (k) => (
        <Button size="sm" variant="ghost" onClick={() => void revoke(k.id)}>
          {t('scim.tokens.revoke')}
        </Button>
      ),
    },
  ]

  const groupColumns: TableColumn<ScimGroup>[] = [
    { key: 'name', header: t('scim.groups.name'), card: 'title', cell: (g) => g.display_name },
    { key: 'members', header: t('scim.groups.members'), cell: (g) => String(g.members) },
  ]

  const logColumns: TableColumn<ScimLogEntry>[] = [
    { key: 'at', header: t('scim.log.at'), cell: (e) => when(e.at) },
    { key: 'op', header: t('scim.log.operation'), card: 'title', cell: (e) => e.operation },
    {
      key: 'who',
      header: t('scim.log.who'),
      cell: (e) =>
        e.membership_id
          ? (names.of(e.membership_id) ?? e.membership_id.slice(0, 8))
          : e.group_id
            ? (groups.find((g) => g.id === e.group_id)?.display_name ??
              String(e.details.group ?? ''))
            : '',
    },
    {
      key: 'outcome',
      header: t('scim.log.outcome'),
      cell: (e) => (
        <Badge
          variant={e.outcome === 'ok' ? 'secondary' : e.outcome === 'halted' ? 'primary' : 'danger'}
        >
          {t(`scim.log.outcomes.${e.outcome}`)}
        </Badge>
      ),
    },
    { key: 'error', header: t('scim.log.error'), cell: (e) => e.error ?? '' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('scim.title')}</h1>
      <p className="max-w-3xl text-sm">{t('scim.intro')}</p>
      {!settings.available && <Alert variant="info">{t('scim.plan')}</Alert>}

      {settings.halted && (
        <Alert variant="danger">
          <p className="font-medium">{t('scim.halt.title')}</p>
          <p className="text-sm">{settings.halted.reason}</p>
          <div className="mt-2">
            <Button size="sm" onClick={() => setReviewing(true)}>
              {t('scim.halt.review')}
            </Button>
          </div>
        </Alert>
      )}

      <Card header={t('scim.connection.title')}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={t('scim.connection.url')}
              value={url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <Button variant="secondary" onClick={() => void copy(url)}>
            {t('scim.copy')}
          </Button>
        </div>
        <p className="mt-3 text-sm">
          {settings.last_call_at
            ? t('scim.connection.lastRequest', {
                date: when(settings.last_call_at),
                operation: settings.last_operation ?? '',
              })
            : t('scim.connection.never')}
        </p>
      </Card>

      <Card header={t('scim.tokens.title')}>
        <p className="mb-3 text-sm">{t('scim.tokens.intro')}</p>
        {settings.tokens.length > 0 && (
          <Table
            caption={t('scim.tokens.title')}
            columns={tokenColumns}
            rows={settings.tokens}
            rowKey={(k) => k.id}
          />
        )}
        <div className="mt-3">
          <Button disabled={!settings.available} onClick={() => void generate()}>
            {settings.tokens.length > 0 ? t('scim.tokens.rotate') : t('scim.tokens.generate')}
          </Button>
        </div>
      </Card>

      <Card header={t('scim.guide.title')}>
        <Tabs
          label={t('scim.guide.title')}
          items={PROVIDERS.map((p) => ({
            value: p,
            label: t(`scim.guide.${p}.name`),
            content: (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                {GUIDE_STEPS[p].map((key) => (
                  <li key={key}>{t(key, { ...DEFAULT_VARIABLES, url })}</li>
                ))}
              </ol>
            ),
          }))}
        />
      </Card>

      <Card header={t('scim.groups.title')}>
        <p className="mb-3 text-sm">{t('scim.groups.intro')}</p>
        <Table
          caption={t('scim.groups.title')}
          columns={groupColumns}
          rows={groups}
          rowKey={(g) => g.id}
          empty={t('scim.groups.empty')}
        />
      </Card>

      <Card header={t('scim.log.title')}>
        <p className="mb-3 text-sm">
          {t('scim.log.intro')}{' '}
          <Link className="link" to={`/audit?actor=${encodeURIComponent(SCIM_ACTOR)}`}>
            {t('scim.log.audit')}
          </Link>
        </p>
        <Table
          caption={t('scim.log.title')}
          columns={logColumns}
          rows={log ?? []}
          rowKey={(e) => e.id}
          loading={log === null}
          empty={t('scim.log.empty')}
        />
      </Card>

      <Modal
        open={secret !== null}
        onOpenChange={(open) => !open && setSecret(null)}
        title={t('scim.tokens.newTitle')}
        footer={<Button onClick={() => setSecret(null)}>{t('scim.tokens.done')}</Button>}
      >
        <Alert variant="warn">{t('scim.tokens.once')}</Alert>
        <div className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={t('scim.tokens.token')}
              value={secret ?? ''}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <Button variant="secondary" onClick={() => secret && void copy(secret)}>
            {t('scim.copy')}
          </Button>
        </div>
      </Modal>

      {settings.halted && (
        <Modal
          open={reviewing}
          onOpenChange={setReviewing}
          title={t('scim.halt.title')}
          footer={
            <>
              <Button variant="ghost" onClick={() => void resolve('dismiss')}>
                {t('scim.halt.dismiss')}
              </Button>
              <Button variant="danger" onClick={() => void resolve('apply')}>
                {t('scim.halt.apply')}
              </Button>
            </>
          }
        >
          <p className="text-sm">{settings.halted.reason}</p>
          <ul className="mt-3 space-y-3 text-sm">
            {settings.halted.changes.map((c, i) => (
              <li key={i}>
                <p className="font-medium">
                  {c.kind === 'group'
                    ? t('scim.halt.group', {
                        group: c.group_name ?? '',
                        count: c.memberships.length,
                      })
                    : t('scim.halt.deactivate', { count: c.memberships.length })}
                </p>
                <PeopleList ids={c.memberships} names={names} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t('scim.halt.explain')}</p>
        </Modal>
      )}
    </div>
  )
}

type Names = ReturnType<typeof useNames>

function PeopleList({ ids, names }: { ids: string[]; names: Names }) {
  const { t } = useTranslation('admin')
  useEffect(() => {
    names.want(ids.slice(0, 50))
  }, [ids, names])
  return (
    <p className="text-muted-foreground">
      {ids
        .slice(0, 50)
        .map((id) => names.of(id) ?? id.slice(0, 8))
        .join(', ')}
      {ids.length > 50 ? ` ${t('scim.halt.more', { count: ids.length - 50 })}` : ''}
    </p>
  )
}

/** Names for membership ids, asked of the user service once each. */
function useNames(api: Api | undefined, orgId: string | undefined) {
  const [known, setKnown] = useState<Record<string, string>>({})
  const asked = useRef(new Set<string>())
  const want = useCallback(
    (ids: (string | undefined)[]) => {
      if (!api || !orgId) return
      for (const id of ids) {
        if (!id || asked.current.has(id)) continue
        asked.current.add(id)
        void api.user
          .GET('/v1/organizations/{org_id}/memberships/{membership_id}', {
            params: { path: { org_id: orgId, membership_id: id } },
          })
          .then(({ data }) => {
            if (data) setKnown((k) => ({ ...k, [id]: data.user.name }))
          })
      }
    },
    [api, orgId],
  )
  return useMemo(() => ({ of: (id: string) => known[id], want }), [known, want])
}
