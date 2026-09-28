import { Button, Input, Select, Table, toast, type TableColumn } from '@unityevolv/unitykit'
import type { audit } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { auditQuery, membershipOf, readAuditView, writeAuditView, type AuditView } from './audit'

type Event = audit.components['schemas']['AuditEvent']

/** The text filters, in order, and the input each is. */
const FILTERS = [
  ['action', 'text'],
  ['actor', 'text'],
  ['targetType', 'text'],
  ['targetId', 'text'],
  ['from', 'date'],
  ['to', 'date'],
] as const satisfies readonly (readonly [keyof AuditView, string])[]

/**
 * Who did what, and when (UO-85): the org's audit log, filtered by actor,
 * action, target and dates, newest or oldest first, a page at a time, and
 * exported as CSV for a compliance request. Owners and Admins by default;
 * the server refuses anyone else however this page is reached.
 */
export default function AuditLogPage() {
  const { t, i18n } = useTranslation('admin')
  const org = useOrg()
  const [params, setParams] = useSearchParams()
  const view = readAuditView(params)
  const [draft, setDraft] = useState<AuditView>(view)
  const [rows, setRows] = useState<Event[]>([])
  const [next, setNext] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [exporting, setExporting] = useState(false)
  const names = useNames()
  const orgId = org?.orgId
  const api = org?.api
  const key = params.toString()

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void api.audit
      .GET('/v1/organizations/{org_id}/audit-events', {
        params: {
          path: { org_id: orgId },
          query: { ...auditQuery(readAuditView(new URLSearchParams(key))), limit: 50 },
        },
      })
      .then(({ data }) => {
        if (!current) return
        setLoading(false)
        setFailed(!data)
        setRows(data?.events ?? [])
        setNext(data?.next_cursor)
      })
    return () => {
      current = false
    }
  }, [api, orgId, key, attempt])

  useEffect(() => {
    if (api && orgId) names.resolve(api, orgId, rows)
  }, [api, orgId, rows, names])

  if (!org || !api || !orgId) return null

  const more = async () => {
    if (!next) return
    const { data } = await api.audit.GET('/v1/organizations/{org_id}/audit-events', {
      params: { path: { org_id: orgId }, query: { ...auditQuery(view), limit: 50, cursor: next } },
    })
    if (!data) {
      toast.error(t('audit.failed'))
      return
    }
    setRows((current) => [...current, ...data.events])
    setNext(data.next_cursor)
  }

  const download = async () => {
    setExporting(true)
    const { data, error } = await api.audit.GET('/v1/organizations/{org_id}/audit-events/export', {
      params: { path: { org_id: orgId }, query: auditQuery(view) },
      parseAs: 'blob',
    })
    setExporting(false)
    if (!data) {
      toast.error((error as { message?: string } | undefined)?.message ?? t('audit.exportFailed'))
      return
    }
    const url = URL.createObjectURL(data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'audit-log.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const apply = () => {
    setLoading(true)
    setParams(writeAuditView(draft))
  }

  const when = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const person = (id: string) => names.of(id) ?? id.slice(0, 8)
  const columns: TableColumn<Event>[] = [
    {
      key: 'when',
      header: t('audit.columns.when'),
      card: 'title',
      cell: (e) => when.format(new Date(e.occurred_at)),
    },
    {
      key: 'actor',
      header: t('audit.columns.actor'),
      cell: (e) => {
        const membership = membershipOf(e.actor)
        return membership ? person(membership) : e.actor
      },
    },
    { key: 'action', header: t('audit.columns.action'), cell: (e) => <code>{e.action}</code> },
    {
      key: 'target',
      header: t('audit.columns.target'),
      cell: (e) =>
        e.target_type === 'membership'
          ? person(e.target_id)
          : `${e.target_type} ${e.target_id.slice(0, 8)}`,
    },
    {
      key: 'details',
      header: t('audit.columns.details'),
      cell: (e) =>
        Object.keys(e.details).length ? (
          <code className="text-xs">{JSON.stringify(e.details)}</code>
        ) : null,
    },
  ]

  const field = (name: keyof AuditView, label: string, type: string) => (
    <Input
      key={name}
      label={label}
      type={type}
      value={draft[name]}
      onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
      onKeyDown={(e) => e.key === 'Enter' && apply()}
    />
  )

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('audit.title')}</h1>
        <Button variant="secondary" disabled={exporting} onClick={() => void download()}>
          {t('audit.export')}
        </Button>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FILTERS.map(([name, type]) => field(name, t(`audit.filters.${name}`), type))}
        <Select
          label={t('audit.filters.order')}
          value={draft.order}
          onChange={(e) => setDraft({ ...draft, order: e.target.value as AuditView['order'] })}
        >
          <option value="newest">{t('audit.newest')}</option>
          <option value="oldest">{t('audit.oldest')}</option>
        </Select>
        <div className="flex items-end gap-2">
          <Button onClick={apply}>{t('audit.apply')}</Button>
          <Button
            variant="ghost"
            onClick={() => {
              const empty = readAuditView(new URLSearchParams())
              setDraft(empty)
              setParams(writeAuditView(empty))
            }}
          >
            {t('audit.clear')}
          </Button>
        </div>
      </div>
      <Table
        caption={t('audit.title')}
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={loading}
        error={failed ? t('audit.failed') : undefined}
        onRetry={() => setAttempt((n) => n + 1)}
        empty={t('audit.empty')}
      />
      {next && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => void more()}>
            {t('audit.more')}
          </Button>
        </div>
      )}
    </>
  )
}

/**
 * Names for the memberships an entry names, looked up once each. The log
 * holds ids only, never a name; the page asks the user service, which the
 * viewer may read anyway, and shows the id's start for anyone it cannot find.
 */
function useNames() {
  const [known, setKnown] = useState<Record<string, string>>({})
  const asked = useRef(new Set<string>())
  return useMemo(
    () => ({
      of: (id: string) => known[id],
      resolve(api: NonNullable<ReturnType<typeof useOrg>>['api'], orgId: string, events: Event[]) {
        const wanted = new Set<string>()
        for (const e of events) {
          const actor = membershipOf(e.actor)
          if (actor) wanted.add(actor)
          if (e.target_type === 'membership') wanted.add(e.target_id)
        }
        for (const id of wanted) {
          if (asked.current.has(id)) continue
          asked.current.add(id)
          void api.user
            .GET('/v1/organizations/{org_id}/memberships/{membership_id}', {
              params: { path: { org_id: orgId, membership_id: id } },
            })
            .then(({ data }) => {
              if (data) setKnown((current) => ({ ...current, [id]: data.user.name }))
            })
        }
      },
    }),
    [known],
  )
}
