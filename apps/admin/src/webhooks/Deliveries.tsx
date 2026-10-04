import type { Api } from '@b2b-template/api'
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Select,
  Spinner,
  Table,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DELIVERY_STATUSES,
  outcome,
  refusal,
  type Attempt,
  type Delivery,
  type DeliveryDetail,
  type DeliveryStatus,
  type Endpoint,
} from './webhooks'

/** The admin namespace's `t`, for a helper outside a component. */
export type AdminT = ReturnType<typeof useTranslation<'admin'>>['t']

/** A page of deliveries: the service's default size. */
const PAGE = 50

const STATUS_BADGE = {
  pending: 'secondary',
  succeeded: 'primary',
  failed: 'danger',
} as const satisfies Record<DeliveryStatus, string>

/** The list's query: the filters set, a page at a time. */
function deliveryQuery(endpointId: string, status: DeliveryStatus | '') {
  return {
    ...(endpointId ? { endpoint_id: endpointId } : {}),
    ...(status ? { status } : {}),
    limit: PAGE,
  }
}

/**
 * Every delivery, newest first, filtered by endpoint and status, a page at
 * a time. One opens in a drawer with the body sent and every attempt, and
 * is resent from there: the same message and webhook-id, signed afresh.
 */
export function Deliveries({
  api,
  orgId,
  endpoints,
  available,
  version,
  onPlanRefused,
}: {
  api: Api
  orgId: string
  endpoints: Endpoint[]
  /** Whether the plan has webhooks now; a resend needs it. */
  available: boolean
  /** Bumped by the page when a test or a delete changes the list. */
  version: number
  onPlanRefused: (requiredPlan?: string) => void
}) {
  const { t, i18n } = useTranslation('admin')
  const [endpointId, setEndpointId] = useState('')
  const [status, setStatus] = useState<DeliveryStatus | ''>('')
  const [rows, setRows] = useState<Delivery[]>([])
  const [next, setNext] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [more, setMore] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [detail, setDetail] = useState<DeliveryDetail | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    let current = true
    void api.webhooks
      .GET('/v1/organizations/{org_id}/webhook-deliveries', {
        params: { path: { org_id: orgId }, query: deliveryQuery(endpointId, status) },
      })
      .then(({ data }) => {
        if (!current) return
        setLoading(false)
        setFailed(!data)
        setRows(data?.deliveries ?? [])
        setNext(data?.next_cursor)
      })
    return () => {
      current = false
    }
  }, [api, orgId, endpointId, status, attempt, version])

  useEffect(() => {
    if (!open) return
    let current = true
    void api.webhooks
      .GET('/v1/organizations/{org_id}/webhook-deliveries/{delivery_id}', {
        params: { path: { org_id: orgId, delivery_id: open } },
      })
      .then(({ data }) => {
        if (!current) return
        if (data) setDetail(data)
        else {
          toast.error(t('webhooks.deliveries.detailFailed'))
          setOpen(null)
        }
      })
    return () => {
      current = false
    }
  }, [api, orgId, open, t])

  const loadMore = async () => {
    if (!next) return
    setMore(true)
    const { data } = await api.webhooks.GET('/v1/organizations/{org_id}/webhook-deliveries', {
      params: {
        path: { org_id: orgId },
        query: { ...deliveryQuery(endpointId, status), cursor: next },
      },
    })
    setMore(false)
    if (!data) {
      toast.error(t('webhooks.deliveries.failed'))
      return
    }
    setRows((current) => [...current, ...data.deliveries])
    setNext(data.next_cursor)
  }

  const resend = async () => {
    if (!detail) return
    setResending(true)
    const { data, error } = await api.webhooks.POST(
      '/v1/organizations/{org_id}/webhook-deliveries/{delivery_id}/resend',
      { params: { path: { org_id: orgId, delivery_id: detail.id } } },
    )
    setResending(false)
    if (!data) {
      const r = refusal(error)
      if (r.kind === 'plan') onPlanRefused(r.requiredPlan)
      else toast.error((r.kind === 'other' && r.message) || t('webhooks.errors.resendFailed'))
      return
    }
    setDetail(data)
    announce(data, t)
    setAttempt((n) => n + 1)
  }

  const close = () => {
    setOpen(null)
    setDetail(null)
  }

  const date = (at: string) =>
    new Date(at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const endpointName = (id: string) => endpoints.find((e) => e.id === id)?.url ?? id.slice(0, 8)
  const result = (d: Pick<Delivery, 'last_status_code' | 'last_error'>) => {
    const r = outcome(d)
    if (!r) return t('webhooks.deliveries.notYet')
    return 'code' in r ? t('webhooks.attempt.answered', { code: String(r.code) }) : r.error
  }
  const statusBadge = (s: DeliveryStatus) => (
    <Badge variant={STATUS_BADGE[s]}>{t(`webhooks.status.${s}`)}</Badge>
  )

  const columns: TableColumn<Delivery>[] = [
    {
      key: 'when',
      header: t('webhooks.deliveries.when'),
      card: 'title',
      cell: (d) => date(d.created_at),
    },
    {
      key: 'event',
      header: t('webhooks.deliveries.event'),
      cell: (d) => <code>{d.event_type}</code>,
    },
    {
      key: 'endpoint',
      header: t('webhooks.deliveries.endpoint'),
      cell: (d) => <span className="break-all">{endpointName(d.endpoint_id)}</span>,
    },
    { key: 'status', header: t('webhooks.deliveries.status'), cell: (d) => statusBadge(d.status) },
    { key: 'attempts', header: t('webhooks.deliveries.attempts'), cell: (d) => d.attempts },
    { key: 'result', header: t('webhooks.deliveries.result'), cell: result },
    {
      key: 'actions',
      header: t('webhooks.endpoints.actions'),
      cell: (d) => (
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('webhooks.deliveries.viewOne', {
            event: d.event_type,
            date: date(d.created_at),
          })}
          onClick={() => {
            setDetail(null)
            setOpen(d.id)
          }}
        >
          {t('webhooks.deliveries.view')}
        </Button>
      ),
    },
  ]

  const attemptColumns: TableColumn<Attempt>[] = [
    {
      key: 'when',
      header: t('webhooks.deliveries.when'),
      card: 'title',
      cell: (a) => date(a.attempted_at),
    },
    {
      key: 'by',
      header: t('webhooks.attempts.by'),
      cell: (a) => t(a.manual ? 'webhooks.attempts.manual' : 'webhooks.attempts.automatic'),
    },
    {
      key: 'code',
      header: t('webhooks.attempts.statusCode'),
      cell: (a) => a.status_code ?? t('webhooks.attempts.noCode'),
    },
    {
      key: 'latency',
      header: t('webhooks.attempts.latency'),
      cell: (a) => t('webhooks.attempts.ms', { ms: String(a.latency_ms) }),
    },
    { key: 'error', header: t('webhooks.attempts.error'), cell: (a) => a.error ?? '' },
  ]

  return (
    <Card header={t('webhooks.deliveries.title')}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Select
          label={t('webhooks.deliveries.filterEndpoint')}
          value={endpointId}
          onChange={(e) => {
            setLoading(true)
            setEndpointId(e.target.value)
          }}
        >
          <option value="">{t('webhooks.deliveries.anyEndpoint')}</option>
          {endpoints.map((e) => (
            <option key={e.id} value={e.id}>
              {e.description ? `${e.description} (${e.url})` : e.url}
            </option>
          ))}
        </Select>
        <Select
          label={t('webhooks.deliveries.filterStatus')}
          value={status}
          onChange={(e) => {
            setLoading(true)
            setStatus(e.target.value as DeliveryStatus | '')
          }}
        >
          <option value="">{t('webhooks.deliveries.anyStatus')}</option>
          {DELIVERY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`webhooks.status.${s}`)}
            </option>
          ))}
        </Select>
      </div>
      <Table
        caption={t('webhooks.deliveries.title')}
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        loading={loading}
        error={failed ? t('webhooks.deliveries.failed') : undefined}
        onRetry={() => setAttempt((n) => n + 1)}
        empty={t('webhooks.deliveries.empty')}
      />
      {next && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" disabled={more} onClick={() => void loadMore()}>
            {t('webhooks.deliveries.more')}
          </Button>
        </div>
      )}

      <Drawer
        open={open !== null}
        onOpenChange={(o) => !o && close()}
        title={t('webhooks.deliveries.detailTitle')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('webhooks.close')}
            </Button>
            <Button disabled={!detail || !available || resending} onClick={() => void resend()}>
              {t('webhooks.deliveries.resend')}
            </Button>
          </>
        }
      >
        {!detail ? (
          <Spinner block label={t('webhooks.loading')} />
        ) : (
          <div className="space-y-4 p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium">{t('webhooks.deliveries.event')}</dt>
              <dd>
                <code>{detail.event_type}</code>
              </dd>
              <dt className="font-medium">{t('webhooks.deliveries.endpoint')}</dt>
              <dd className="break-all">{endpointName(detail.endpoint_id)}</dd>
              <dt className="font-medium">{t('webhooks.deliveries.status')}</dt>
              <dd>{statusBadge(detail.status)}</dd>
              <dt className="font-medium">{t('webhooks.deliveries.messageId')}</dt>
              <dd>
                <code className="break-all">{detail.message_id}</code>
              </dd>
              <dt className="font-medium">{t('webhooks.deliveries.attempts')}</dt>
              <dd>{detail.attempts}</dd>
              {detail.status === 'pending' && detail.next_attempt_at && (
                <>
                  <dt className="font-medium">{t('webhooks.deliveries.nextAttempt')}</dt>
                  <dd>{date(detail.next_attempt_at)}</dd>
                </>
              )}
            </dl>
            {!available && <Alert variant="info">{t('webhooks.deliveries.resendPlan')}</Alert>}
            <section>
              <h3 className="mb-1 text-sm font-medium">{t('webhooks.deliveries.payload')}</h3>
              <pre className="overflow-x-auto rounded bg-base-200 p-3 text-xs">
                <code>{JSON.stringify(detail.payload, null, 2)}</code>
              </pre>
            </section>
            <section>
              <h3 className="mb-1 text-sm font-medium">{t('webhooks.attempts.title')}</h3>
              <Table
                caption={t('webhooks.attempts.title')}
                columns={attemptColumns}
                rows={detail.attempt_log}
                rowKey={(a) => a.id}
                empty={t('webhooks.attempts.empty')}
              />
            </section>
          </div>
        )}
      </Drawer>
    </Card>
  )
}

/** Says how a test or a resend went: delivered with its status, or why not. */
export function announce(delivery: DeliveryDetail, t: AdminT) {
  const result = outcome(delivery)
  if (delivery.status === 'succeeded') {
    toast.success(
      t('webhooks.attempt.succeeded', {
        code: result && 'code' in result ? String(result.code) : '',
        ms: String(delivery.last_latency_ms ?? 0),
      }),
    )
    return
  }
  const reason =
    result && 'code' in result
      ? t('webhooks.attempt.answered', { code: String(result.code) })
      : result
        ? result.error
        : t('webhooks.attempt.noAnswer')
  toast.error(t('webhooks.attempt.failed', { reason }))
}
