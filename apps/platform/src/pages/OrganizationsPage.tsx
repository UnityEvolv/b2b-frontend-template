import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  Table,
  type TableColumn,
  type TableSort,
} from '@unityevolv/unitykit'
import type { organization } from '@b2b-template/api'
import { humanizeKey } from '@b2b-template/core'
import { useApp } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'

import {
  isBandName,
  PAGE_SIZES,
  readView,
  STATUSES,
  writeView,
  type ListView,
} from './organizations'

type Organization = organization.components['schemas']['Organization']

/**
 * Every organization on the platform. Search, filters, sort and
 * paging run on the server, and the whole view lives in the URL, so a view
 * can be shared or reloaded.
 */
export default function OrganizationsPage() {
  const { t, i18n } = useTranslation('platform')
  const { auth } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = readView(params)
  const [q, setQ] = useState(view.q)
  const [rows, setRows] = useState<Organization[]>([])
  const [next, setNext] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const api = auth?.api
  const key = params.toString()

  // A changed question starts again from the first page.
  const change = (patch: Partial<ListView>) => {
    setLoading(true)
    setParams(writeView({ ...view, pages: [], ...patch }))
  }

  // Typing settles for a moment before it becomes part of the URL.
  useEffect(() => {
    if (q.trim() === view.q) return
    const timer = setTimeout(() => {
      setLoading(true)
      setParams(writeView({ ...view, q: q.trim(), pages: [] }))
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the view is the URL, keyed below
  }, [q, key])

  useEffect(() => {
    if (!api) return
    let current = true
    const v = readView(new URLSearchParams(key))
    const cursor = v.pages[v.pages.length - 1]
    void api.organization
      .GET('/v1/organizations', {
        params: {
          query: {
            limit: v.limit,
            sort: v.sort,
            order: v.order,
            ...(cursor ? { cursor } : {}),
            ...(v.q ? { q: v.q } : {}),
            ...(v.plan ? { plan: v.plan } : {}),
            ...(v.status ? { status: v.status } : {}),
          },
        },
      })
      .then(({ data }) => {
        if (!current) return
        setLoading(false)
        setFailed(!data)
        setRows(data?.organizations ?? [])
        setNext(data?.next_cursor)
      })
    return () => {
      current = false
    }
  }, [api, key, attempt])

  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const columns: TableColumn<Organization>[] = [
    {
      key: 'name',
      header: t('organizations.columns.name'),
      sortable: true,
      card: 'title',
      cell: (o) => o.name,
    },
    {
      key: 'domain',
      header: t('organizations.columns.domain'),
      cell: (o) => o.domain ?? t('organizations.none'),
    },
    { key: 'plan', header: t('organizations.columns.plan'), cell: (o) => humanizeKey(o.plan) },
    {
      key: 'status',
      header: t('organizations.columns.status'),
      cell: (o) => (
        <Badge variant={o.status === 'suspended' ? 'danger' : 'secondary'}>
          {t(`statuses.${o.status}`)}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: t('organizations.columns.created'),
      sortable: true,
      cell: (o) => date.format(new Date(o.created_at)),
    },
  ]
  const filtered = Boolean(view.q || view.plan || view.status)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('organizations.title')}</h1>
        <Link to="/organizations/new" className="btn btn-primary">
          {t('organizations.create')}
        </Link>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Input
          type="search"
          label={t('organizations.search')}
          help={t('organizations.searchHelp')}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <Input
          label={t('organizations.columns.plan')}
          help={t('organizations.planHelp')}
          value={view.plan}
          onChange={(e) => {
            const plan = e.target.value.trim()
            change({ plan: isBandName(plan) ? plan : '' })
          }}
        />
        <Select
          label={t('organizations.columns.status')}
          value={view.status}
          onChange={(e) => change({ status: e.target.value as ListView['status'] })}
        >
          <option value="">{t('organizations.any')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </Select>
        <Select
          label={t('organizations.pageSize')}
          value={String(view.limit)}
          onChange={(e) => change({ limit: Number(e.target.value) })}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {t('organizations.perPage', { size: String(size) })}
            </option>
          ))}
        </Select>
      </div>
      <Table
        caption={t('organizations.title')}
        columns={columns}
        rows={rows}
        rowKey={(o) => o.org_id}
        loading={loading}
        error={failed ? t('organizations.failed') : undefined}
        onRetry={() => setAttempt((n) => n + 1)}
        sort={{ key: view.sort, direction: view.order }}
        onSortChange={(s: TableSort) =>
          change({ sort: s.key === 'name' ? 'name' : 'created_at', order: s.direction })
        }
        onRowClick={(o: Organization) => navigate(`/organizations/${o.org_id}`)}
        empty={
          <EmptyState
            icon="users"
            titleAs="h2"
            title={filtered ? t('organizations.noMatch') : t('organizations.empty')}
            action={
              <Link to="/organizations/new" className="btn btn-primary">
                {t('organizations.create')}
              </Link>
            }
          />
        }
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="ghost"
          disabled={view.pages.length === 0}
          onClick={() => {
            setLoading(true)
            setParams(writeView({ ...view, pages: view.pages.slice(0, -1) }))
          }}
        >
          {t('organizations.previous')}
        </Button>
        <Button
          variant="ghost"
          disabled={!next}
          onClick={() => {
            if (!next) return
            setLoading(true)
            setParams(writeView({ ...view, pages: [...view.pages, next] }))
          }}
        >
          {t('organizations.next')}
        </Button>
      </div>
    </>
  )
}
