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
import type { user } from '@b2b-template/api'
import { MEMBERSHIP_STATUSES, ORG_ROLES, useOrg } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

type Membership = user.components['schemas']['Membership']

const PAGE = 50

/**
 * Everyone in the organization (UO-60): search, filters and sort run on the
 * server, and so does pagination, so a list of several hundred is one page
 * at a time. Guests are members like any other, marked and filterable.
 */
export default function UsersPage() {
  const { t, i18n } = useTranslation('admin')
  const org = useOrg()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('')
  const [sort, setSort] = useState<TableSort>({ key: 'name', direction: 'asc' })
  // The cursors of the pages seen so far, so "previous" is a step back.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const [rows, setRows] = useState<Membership[]>([])
  const [next, setNext] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Typing settles for a moment before it becomes a query.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const cursor = cursors[cursors.length - 1]
  const orgId = org?.orgId
  const api = org?.api
  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void api.user
      .GET('/v1/organizations/{org_id}/memberships', {
        params: {
          path: { org_id: orgId },
          query: {
            limit: PAGE,
            sort: sort.key === 'created_at' ? 'created_at' : 'name',
            order: sort.direction,
            ...(cursor ? { cursor } : {}),
            ...(query ? { q: query } : {}),
            ...(role ? { role } : {}),
            ...(status ? { status: status as Membership['status'] } : {}),
            ...(department ? { department } : {}),
          },
        },
      })
      .then(({ data }) => {
        if (!current) return
        setLoading(false)
        if (!data) {
          setFailed(true)
          return
        }
        setFailed(false)
        setRows(data.memberships)
        setNext(data.next_cursor)
      })
    return () => {
      current = false
    }
  }, [api, orgId, query, role, status, department, sort, cursor, attempt])

  // A changed question starts again from the first page.
  const restart = () => {
    setLoading(true)
    setCursors([undefined])
  }

  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const columns: TableColumn<Membership>[] = [
    {
      key: 'name',
      header: t('users.columns.name'),
      sortable: true,
      card: 'title',
      cell: (m) => (
        <span className="flex items-center gap-2">
          {m.user.name}
          {m.kind === 'guest' && <Badge variant="secondary">{t('users.guest')}</Badge>}
        </span>
      ),
    },
    { key: 'email', header: t('users.columns.email'), cell: (m) => m.user.email },
    {
      key: 'role',
      header: t('users.columns.role'),
      cell: (m) => t(`roles.${m.role}` as never, { ns: 'common' }),
    },
    {
      key: 'status',
      header: t('users.columns.status'),
      cell: (m) => t(`users.status.${m.status}` as never),
    },
    {
      key: 'created_at',
      header: t('users.columns.lastActive'),
      sortable: true,
      cell: (m) => (m.last_active_at ? date.format(new Date(m.last_active_at)) : t('users.never')),
    },
  ]

  if (!org) return <EmptyState icon="users" titleAs="h2" title={t('users.empty')} />

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('users.title')}</h1>
        <div className="flex gap-2">
          <Link to="/users/import" className="btn btn-ghost">
            {t('users.import')}
          </Link>
          <Link to="/users/invite" className="btn btn-primary">
            {t('users.invite')}
          </Link>
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Input
          type="search"
          label={t('users.search')}
          value={q}
          onChange={(event) => {
            setQ(event.target.value)
            restart()
          }}
        />
        <Select
          label={t('users.columns.role')}
          value={role}
          onChange={(e) => (setRole(e.target.value), restart())}
        >
          <option value="">{t('users.any')}</option>
          {ORG_ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}` as never, { ns: 'common' })}
            </option>
          ))}
        </Select>
        <Select
          label={t('users.columns.status')}
          value={status}
          onChange={(e) => (setStatus(e.target.value), restart())}
        >
          <option value="">{t('users.any')}</option>
          {MEMBERSHIP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`users.status.${s}` as never)}
            </option>
          ))}
        </Select>
        <Input
          label={t('users.department')}
          value={department}
          onChange={(event) => {
            setDepartment(event.target.value)
            restart()
          }}
        />
      </div>
      <Table
        caption={t('users.title')}
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        loading={loading}
        error={failed ? t('users.failed') : undefined}
        onRetry={() => setAttempt((n) => n + 1)}
        sort={sort}
        onSortChange={(next: TableSort) => {
          setSort(next)
          restart()
        }}
        onRowClick={(m: Membership) => navigate(`/users/${m.id}`)}
        empty={
          <EmptyState
            icon="users"
            titleAs="h2"
            title={query || role || status || department ? t('users.noMatch') : t('users.onlyYou')}
            action={
              <Link to="/users/invite" className="btn btn-primary">
                {t('users.invite')}
              </Link>
            }
          />
        }
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="ghost"
          disabled={cursors.length === 1}
          onClick={() => setCursors((c) => c.slice(0, -1))}
        >
          {t('users.previous')}
        </Button>
        <Button
          variant="ghost"
          disabled={!next}
          onClick={() => next && setCursors((c) => [...c, next])}
        >
          {t('users.next')}
        </Button>
      </div>
    </>
  )
}
