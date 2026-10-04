import type { Api } from '@b2b-template/api'
import { bandLabel, useOrg, usePlanCatalogue, useSession } from '@b2b-template/ui-web'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Spinner,
  Table,
  Textarea,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { announce, Deliveries } from './Deliveries'
import {
  DEFAULT_OVERLAP_HOURS,
  EMPTY_ENDPOINT,
  endpointForm,
  endpointRequest,
  overlapHours,
  refusal,
  type Endpoint,
  type EndpointFields,
  type EndpointForm,
  type EventTypeList,
} from './webhooks'

/** The plan has no webhooks: said by the event types' `available`, or by a refusal. */
interface PlanState {
  refused: boolean
  requiredPlan?: string
}

/**
 * The org's outbound webhooks, for whoever holds the webhooks permission
 * (the route asks for it, as the webhooks service does on every request):
 * its endpoints, made with a signing secret shown this once, changed,
 * turned on and off, deleted after asking, their secret rotated with an
 * overlap, and a test sent; and every delivery, filtered by endpoint and
 * status, with its payload and attempts, resent by hand.
 *
 * Whether the plan has webhooks is the service's to say: the event types
 * answer `available`, and a write it refuses answers `plan.limit_reached`.
 * Adding an endpoint, a test and a resend then wait for a plan that has
 * them; changing, turning off, rotating and deleting work on any plan. A
 * plan refusal links to billing for whoever may change the plan.
 */
export default function WebhooksPage() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const { permissions } = useSession()
  if (!org) return null
  // Billing is where the plan is changed, for whoever may change it.
  const billing = permissions.can('billing') ? { billingPath: '/billing' } : {}
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('webhooks.title')}</h1>
      <p className="max-w-3xl text-sm">{t('webhooks.intro')}</p>
      <Webhooks api={org.api} orgId={org.orgId} {...billing} />
    </div>
  )
}

function Webhooks({ api, orgId, billingPath }: { api: Api; orgId: string; billingPath?: string }) {
  const { t, i18n } = useTranslation('admin')
  const [types, setTypes] = useState<EventTypeList | null>(null)
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [deliveriesVersion, setDeliveriesVersion] = useState(0)
  const [plan, setPlan] = useState<PlanState>({ refused: false })
  const [editing, setEditing] = useState<{ endpoint?: Endpoint; form: EndpointForm } | null>(null)
  const [fields, setFields] = useState<EndpointFields>({})
  const [atLimit, setAtLimit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [secret, setSecret] = useState<{ value: string; rotated: boolean } | null>(null)
  const [rotating, setRotating] = useState<Endpoint | null>(null)
  const [overlap, setOverlap] = useState(String(DEFAULT_OVERLAP_HOURS))
  const [overlapInvalid, setOverlapInvalid] = useState(false)
  const [deleting, setDeleting] = useState<Endpoint | null>(null)
  const catalogue = usePlanCatalogue(plan.requiredPlan ? api : undefined)
  const path = { org_id: orgId }

  useEffect(() => {
    let current = true
    void api.webhooks
      .GET('/v1/organizations/{org_id}/webhook-event-types', {
        params: { path: { org_id: orgId } },
      })
      .then(({ data }) => {
        if (!current) return
        if (!data) {
          setFailed(true)
          return
        }
        setTypes(data)
        setPlan(
          data.available
            ? { refused: false }
            : {
                refused: true,
                ...(data.required_plan ? { requiredPlan: data.required_plan } : {}),
              },
        )
      })
    return () => {
      current = false
    }
  }, [api, orgId])

  useEffect(() => {
    let current = true
    void api.webhooks
      .GET('/v1/organizations/{org_id}/webhook-endpoints', { params: { path: { org_id: orgId } } })
      .then(({ data }) => {
        if (!current) return
        if (!data) setFailed(true)
        else setEndpoints(data.endpoints)
      })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  if (failed) return <Alert variant="danger">{t('webhooks.failed')}</Alert>
  if (!types || !endpoints) return <Spinner block size="lg" label={t('webhooks.loading')} />

  const available = !plan.refused
  const reload = () => setVersion((v) => v + 1)
  const refusePlan = (requiredPlan?: string) =>
    setPlan({ refused: true, ...(requiredPlan ? { requiredPlan } : {}) })
  const date = (at: string) =>
    new Date(at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const typeList = (e: Endpoint) =>
    e.event_types.length === 0 ? t('webhooks.endpoints.allEvents') : e.event_types.join(', ')
  /** A failed write: the plan, the cap, a field, or the service's words. */
  const refused = (error: unknown, fallback: string) => {
    const r = refusal(error)
    if (r.kind === 'plan') {
      setEditing(null)
      refusePlan(r.requiredPlan)
    } else if (r.kind === 'limit') setAtLimit(true)
    else if (r.kind === 'fields') setFields(r.fields)
    else toast.error(r.message ?? fallback)
  }

  const open = (endpoint?: Endpoint) => {
    setFields({})
    setAtLimit(false)
    setEditing(
      endpoint ? { endpoint, form: endpointForm(endpoint) } : { form: { ...EMPTY_ENDPOINT } },
    )
  }

  const save = async () => {
    if (!editing) return
    const body = endpointRequest(editing.form)
    if (!body) {
      setFields({ url: t('webhooks.errors.urlRequired') })
      return
    }
    setFields({})
    setAtLimit(false)
    setBusy(true)
    if (editing.endpoint) {
      const { data, error } = await api.webhooks.PATCH(
        '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}',
        { params: { path: { ...path, endpoint_id: editing.endpoint.id } }, body },
      )
      setBusy(false)
      if (!data) return refused(error, t('webhooks.errors.saveFailed'))
      setEditing(null)
      toast.success(t('webhooks.endpoints.saved'))
    } else {
      const { data, error } = await api.webhooks.POST(
        '/v1/organizations/{org_id}/webhook-endpoints',
        { params: { path }, body },
      )
      setBusy(false)
      if (!data) return refused(error, t('webhooks.errors.saveFailed'))
      setEditing(null)
      setSecret({ value: data.secret, rotated: false })
    }
    reload()
  }

  const setEnabled = async (endpoint: Endpoint, enabled: boolean) => {
    const { data, error } = await api.webhooks.PATCH(
      '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}',
      { params: { path: { ...path, endpoint_id: endpoint.id } }, body: { enabled } },
    )
    if (!data) {
      toast.error(refusalMessage(error) ?? t('webhooks.errors.saveFailed'))
      return
    }
    toast.success(t(enabled ? 'webhooks.endpoints.turnedOn' : 'webhooks.endpoints.turnedOff'))
    reload()
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    const { error } = await api.webhooks.DELETE(
      '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}',
      { params: { path: { ...path, endpoint_id: deleting.id } } },
    )
    setBusy(false)
    setDeleting(null)
    if (error) toast.error(refusalMessage(error) ?? t('webhooks.errors.deleteFailed'))
    else toast.success(t('webhooks.endpoints.deleted'))
    reload()
    setDeliveriesVersion((v) => v + 1)
  }

  const rotate = async () => {
    if (!rotating) return
    const hours = overlapHours(overlap)
    if (hours === null) {
      setOverlapInvalid(true)
      return
    }
    setOverlapInvalid(false)
    setBusy(true)
    const { data, error } = await api.webhooks.POST(
      '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}/rotate-secret',
      {
        params: { path: { ...path, endpoint_id: rotating.id } },
        body: { overlap_hours: hours },
      },
    )
    setBusy(false)
    if (!data) {
      if (isOverlapRefusal(error)) setOverlapInvalid(true)
      else toast.error(refusalMessage(error) ?? t('webhooks.errors.rotateFailed'))
      return
    }
    setRotating(null)
    setSecret({ value: data.secret, rotated: true })
    reload()
  }

  const test = async (endpoint: Endpoint) => {
    const { data, error } = await api.webhooks.POST(
      '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}/test',
      { params: { path: { ...path, endpoint_id: endpoint.id } } },
    )
    if (!data) {
      const r = refusal(error)
      if (r.kind === 'plan') refusePlan(r.requiredPlan)
      else toast.error((r.kind === 'other' && r.message) || t('webhooks.errors.testFailed'))
      return
    }
    announce(data, t)
    setDeliveriesVersion((v) => v + 1)
  }

  const copy = async () => {
    if (!secret) return
    await navigator.clipboard.writeText(secret.value)
    toast.success(t('webhooks.secret.copied'))
  }

  const columns: TableColumn<Endpoint>[] = [
    {
      key: 'url',
      header: t('webhooks.endpoints.url'),
      card: 'title',
      cell: (e) => (
        <span className="flex flex-col">
          <code className="break-all">{e.url}</code>
          {e.description && <span className="text-sm">{e.description}</span>}
        </span>
      ),
    },
    { key: 'events', header: t('webhooks.endpoints.events'), cell: typeList },
    {
      key: 'state',
      header: t('webhooks.endpoints.state'),
      cell: (e) => (
        <span className="flex flex-col items-start gap-1">
          <Badge variant={e.enabled ? 'primary' : 'secondary'}>
            {t(e.enabled ? 'webhooks.endpoints.on' : 'webhooks.endpoints.off')}
          </Badge>
          {e.previous_secret_expires_at && (
            <span className="text-xs">
              {t('webhooks.endpoints.overlap', { date: date(e.previous_secret_expires_at) })}
            </span>
          )}
        </span>
      ),
    },
    { key: 'created', header: t('webhooks.endpoints.created'), cell: (e) => date(e.created_at) },
    {
      key: 'actions',
      header: t('webhooks.endpoints.actions'),
      cell: (e) => (
        <span className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('webhooks.endpoints.editOne', { url: e.url })}
            onClick={() => open(e)}
          >
            {t('webhooks.endpoints.edit')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t(
              e.enabled ? 'webhooks.endpoints.turnOffOne' : 'webhooks.endpoints.turnOnOne',
              { url: e.url },
            )}
            onClick={() => void setEnabled(e, !e.enabled)}
          >
            {t(e.enabled ? 'webhooks.endpoints.turnOff' : 'webhooks.endpoints.turnOn')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('webhooks.endpoints.testOne', { url: e.url })}
            disabled={!available}
            onClick={() => void test(e)}
          >
            {t('webhooks.endpoints.test')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('webhooks.endpoints.rotateOne', { url: e.url })}
            onClick={() => {
              setOverlap(String(DEFAULT_OVERLAP_HOURS))
              setOverlapInvalid(false)
              setRotating(e)
            }}
          >
            {t('webhooks.endpoints.rotate')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('webhooks.endpoints.deleteOne', { url: e.url })}
            onClick={() => setDeleting(e)}
          >
            {t('webhooks.endpoints.delete')}
          </Button>
        </span>
      ),
    },
  ]

  const form = editing?.form
  const setForm = (next: EndpointForm) => editing && setEditing({ ...editing, form: next })

  return (
    <>
      {plan.refused && (
        <Alert variant="warn">
          {plan.requiredPlan
            ? t('webhooks.plan.refusedWith', { plan: bandLabel(catalogue, plan.requiredPlan) })
            : t('webhooks.plan.refused')}{' '}
          {billingPath ? (
            <Link className="link" to={billingPath}>
              {t('webhooks.plan.seePlan')}
            </Link>
          ) : (
            t('webhooks.plan.askAdmin')
          )}
        </Alert>
      )}

      <Card header={t('webhooks.endpoints.title')}>
        <Table
          caption={t('webhooks.endpoints.title')}
          columns={columns}
          rows={endpoints}
          rowKey={(e) => e.id}
          empty={t('webhooks.endpoints.empty')}
        />
        <div className="mt-3">
          <Button disabled={!available} onClick={() => open()}>
            {t('webhooks.endpoints.add')}
          </Button>
        </div>
      </Card>

      <Deliveries
        api={api}
        orgId={orgId}
        endpoints={endpoints}
        available={available}
        version={deliveriesVersion}
        onPlanRefused={refusePlan}
      />

      <Modal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={t(editing?.endpoint ? 'webhooks.form.editTitle' : 'webhooks.form.addTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('webhooks.cancel')}
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {t(editing?.endpoint ? 'webhooks.form.save' : 'webhooks.form.add')}
            </Button>
          </>
        }
      >
        {form && (
          <form
            noValidate
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            {atLimit && <Alert variant="danger">{t('webhooks.errors.endpointLimit')}</Alert>}
            <Input
              label={t('webhooks.form.url')}
              help={t('webhooks.form.urlHelp')}
              type="url"
              value={form.url}
              maxLength={2048}
              error={fields.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <Textarea
              label={t('webhooks.form.description')}
              value={form.description}
              maxLength={500}
              error={fields.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('webhooks.form.events')}</legend>
              <p className="text-xs">{t('webhooks.form.eventsHelp')}</p>
              {types.event_types.map((type) => (
                <Checkbox
                  key={type.type}
                  label={type.type}
                  help={type.description}
                  checked={form.eventTypes.includes(type.type)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      eventTypes: e.target.checked
                        ? [...form.eventTypes, type.type]
                        : form.eventTypes.filter((x) => x !== type.type),
                    })
                  }
                />
              ))}
              {fields.event_types && <Alert variant="danger">{fields.event_types}</Alert>}
            </fieldset>
            <Checkbox
              label={t('webhooks.form.enabled')}
              help={t('webhooks.form.enabledHelp')}
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={secret !== null}
        onOpenChange={(open) => !open && setSecret(null)}
        title={t(secret?.rotated ? 'webhooks.secret.rotatedTitle' : 'webhooks.secret.newTitle')}
        footer={<Button onClick={() => setSecret(null)}>{t('webhooks.secret.done')}</Button>}
      >
        <Alert variant="warn">{t('webhooks.secret.once')}</Alert>
        <div className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={t('webhooks.secret.label')}
              value={secret?.value ?? ''}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <Button variant="secondary" onClick={() => void copy()}>
            {t('webhooks.secret.copy')}
          </Button>
        </div>
      </Modal>

      <Modal
        open={rotating !== null}
        onOpenChange={(open) => !open && setRotating(null)}
        title={t('webhooks.rotate.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRotating(null)}>
              {t('webhooks.cancel')}
            </Button>
            <Button disabled={busy} onClick={() => void rotate()}>
              {t('webhooks.rotate.submit')}
            </Button>
          </>
        }
      >
        {rotating && (
          <form
            noValidate
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void rotate()
            }}
          >
            <p className="text-sm">{t('webhooks.rotate.intro', { url: rotating.url })}</p>
            <Input
              label={t('webhooks.rotate.overlap')}
              help={t('webhooks.rotate.overlapHelp')}
              type="number"
              min={0}
              max={168}
              step={1}
              value={overlap}
              error={overlapInvalid ? t('webhooks.errors.overlap') : undefined}
              onChange={(e) => setOverlap(e.target.value)}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('webhooks.remove.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('webhooks.cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              {t('webhooks.endpoints.delete')}
            </Button>
          </>
        }
      >
        {deleting && (
          <Alert variant="warn">{t('webhooks.remove.confirm', { url: deleting.url })}</Alert>
        )}
      </Modal>
    </>
  )
}

/** The service's words for a refusal, when it gave some. */
function refusalMessage(error: unknown): string | undefined {
  return (error as { message?: string } | undefined)?.message
}

function isOverlapRefusal(error: unknown): boolean {
  return Boolean((error as { fields?: Record<string, string> } | undefined)?.fields?.overlap_hours)
}
