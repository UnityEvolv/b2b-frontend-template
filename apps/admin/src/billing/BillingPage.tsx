import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  Select,
  Spinner,
  Table,
  Toggle,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { organization } from '@b2b-template/api'
import {
  bandLabel,
  planFeatures,
  planLimits,
  sentenceCase,
  useOrg,
  useOrganizationPlan,
  usePlanCatalogue,
} from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { daysUntil, money, offeredBands, useBilling, type Band, type Invoice } from './billing'

type Consequence = organization.components['schemas']['PlanConsequence']

/**
 * The billing page: what the org is on and paying, and changing
 * either. Card details never pass through here: the provider's hosted form
 * takes them. Everything the page does the API checks again. The bands on
 * offer and their prices come from the billing service; their labels, what
 * the plan allows and what the org uses from the organization service's plan
 * catalogue and the org's plan, each read when the page opens: nothing about
 * a plan is kept here.
 */
export default function BillingPage() {
  const { t, i18n } = useTranslation('admin')
  const org = useOrg()
  const api = org?.api
  const orgId = org?.orgId
  const { account, setAccount, failed, reload } = useBilling(api, orgId, true)
  const catalogue = usePlanCatalogue(api)
  const { plan, reload: reloadPlan } = useOrganizationPlan(api, orgId)
  const label = (band: string) =>
    plan?.plan === band && plan.label ? plan.label : bandLabel(catalogue, band)
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [choice, setChoice] = useState<Band | ''>('')
  const [confirm, setConfirm] = useState<{
    band: Band
    /** Takes effect now (an upgrade), or at the period's end. */
    now: boolean
    amount?: string
    consequences: Consequence[]
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useSearchParams()

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void api.billing
      .GET('/v1/organizations/{org_id}/billing/invoices', { params: { path: { org_id: orgId } } })
      .then(({ data }) => current && setInvoices(data?.invoices ?? []))
    return () => {
      current = false
    }
  }, [api, orgId])

  // Back from the provider's form: the card lands by webhook, a moment later.
  const setup = search.get('setup')
  useEffect(() => {
    if (!setup) return
    const timer = setTimeout(() => {
      if (setup === 'done') toast.success(t('billing.payment.saved'))
      setSearch({}, { replace: true })
      void reload()
    }, 0)
    const later = setTimeout(() => void reload(), 4000)
    return () => {
      clearTimeout(timer)
      clearTimeout(later)
    }
  }, [setup, setSearch, reload, t])

  if (!api || !orgId) return null
  if (failed) return <Alert variant="danger">{t('billing.failed')}</Alert>
  if (!account) return <Spinner block size="lg" label={t('billing.loading')} />

  const price = (band: string) => {
    const p = account.prices[band]
    return p
      ? t('billing.perInterval', {
          price: money(p.amount, p.currency, i18n.language),
          interval: p.interval,
        })
      : ''
  }
  const date = (at?: string) =>
    at ? new Date(at).toLocaleDateString(i18n.language, { dateStyle: 'medium' }) : ''

  const refused = (error: unknown) =>
    toast.error((error as { message?: string } | undefined)?.message ?? t('billing.changeFailed'))

  const addCard = async () => {
    setBusy(true)
    const { data, error } = await api.billing.POST('/v1/organizations/{org_id}/billing/setup', {
      params: { path: { org_id: orgId } },
    })
    setBusy(false)
    if (data) globalThis.location.assign(data.url)
    else refused(error)
  }

  // The service says which way a move goes: an upgrade applies now, anything
  // else at the period's end, with the checklist of what it closes.
  const ask = async (band: Band) => {
    const { data, error } = await api.billing.GET(
      '/v1/organizations/{org_id}/billing/band-preview',
      { params: { path: { org_id: orgId }, query: { band } } },
    )
    if (!data) {
      refused(error)
      return
    }
    if (data.applies === 'now') {
      setConfirm({
        band,
        now: true,
        consequences: [],
        ...(data.currency
          ? { amount: money(data.amount_today, data.currency, i18n.language) }
          : {}),
      })
      return
    }
    const { data: plan } = await api.organization.GET('/v1/organizations/{org_id}/plan-change', {
      params: { path: { org_id: orgId }, query: { plan: band } },
    })
    setConfirm({ band, now: false, consequences: plan?.consequences ?? [] })
  }

  const change = async () => {
    if (!confirm) return
    setBusy(true)
    const { data, error } = await api.billing.PUT('/v1/organizations/{org_id}/billing/band', {
      params: { path: { org_id: orgId } },
      body: { band: confirm.band },
    })
    setBusy(false)
    setConfirm(null)
    setChoice('')
    if (data) {
      setAccount(data)
      void reloadPlan()
      toast.success(confirm.now ? t('billing.plan.upgraded') : t('billing.plan.scheduled'))
    } else refused(error)
  }

  const trial = async () => {
    const { data, error } = await api.billing.POST('/v1/organizations/{org_id}/billing/trial', {
      params: { path: { org_id: orgId } },
    })
    if (data) {
      setAccount(data)
      void reloadPlan()
      toast.success(t('billing.trial.started'))
    } else refused(error)
  }

  const autoUpgrade = async (on: boolean) => {
    const { data, error } = await api.billing.PUT(
      '/v1/organizations/{org_id}/billing/auto-upgrade',
      {
        params: { path: { org_id: orgId } },
        body: { on },
      },
    )
    if (data) setAccount(data)
    else refused(error)
  }

  const cancelPending = async () => {
    const { data, error } = await api.billing.DELETE('/v1/organizations/{org_id}/billing/pending', {
      params: { path: { org_id: orgId } },
    })
    if (data) setAccount(data)
    else refused(error)
  }

  const columns: TableColumn<Invoice>[] = [
    {
      key: 'number',
      header: t('billing.invoices.number'),
      card: 'title',
      cell: (i) => i.number ?? i.id,
    },
    { key: 'date', header: t('billing.invoices.date'), cell: (i) => date(i.created) },
    {
      key: 'amount',
      header: t('billing.invoices.amount'),
      cell: (i) => money(i.amount, i.currency, i18n.language),
    },
    {
      key: 'status',
      header: t('billing.invoices.status'),
      cell: (i) => (
        <span>
          <Badge
            variant={i.status === 'paid' ? 'secondary' : i.status === 'open' ? 'danger' : 'ghost'}
          >
            {t(`billing.invoices.states.${i.status}`, { defaultValue: i.status })}
          </Badge>
          {i.status === 'open' && i.next_attempt && (
            <span className="ml-2 text-xs text-muted-foreground">
              {t('billing.invoices.retry', { date: date(i.next_attempt) })}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'links',
      header: t('billing.invoices.links'),
      cell: (i) => (
        <span className="flex gap-2">
          {i.pdf && (
            <a href={i.pdf} target="_blank" rel="noopener noreferrer" className="link">
              {t('billing.invoices.pdf')}
            </a>
          )}
          {i.status === 'open' && i.pay_url && (
            <a
              href={i.pay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="link font-medium"
            >
              {t('billing.invoices.payNow')}
            </a>
          )}
        </span>
      ),
    },
  ]

  if (account.invoiced) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">{t('billing.title')}</h1>
        <Alert variant="info">{t('billing.invoicedNote')}</Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('billing.title')}</h1>

      <Card header={t('billing.plan.title')}>
        <p className="text-lg font-semibold">
          {label(account.band)}{' '}
          <span className="text-sm font-normal text-muted-foreground">{price(account.band)}</span>
        </p>
        <p className="text-sm">{t(`billing.states.${account.state}`)}</p>
        {account.state === 'trialing' && account.trial_ends_at && (
          <p className="text-sm">
            {t('billing.trial.left', {
              count: daysUntil(account.trial_ends_at),
              date: date(account.trial_ends_at),
            })}
          </p>
        )}
        {account.period_end && account.state !== 'trialing' && (
          <p className="text-sm">
            {t('billing.plan.nextCharge', { date: date(account.period_end) })}
          </p>
        )}
        {plan && (
          <>
            <h2 className="mt-3 text-sm font-medium">{t('billing.plan.limits')}</h2>
            <ul className="mt-1 space-y-1 text-sm" aria-label={t('billing.plan.limits')}>
              {planLimits(plan, catalogue).map((l) => (
                <li key={l.key}>
                  {t('billing.plan.limit', {
                    label: sentenceCase(l.label),
                    value:
                      l.used === undefined
                        ? l.cap
                          ? String(l.cap)
                          : t('billing.plan.noLimit')
                        : l.cap
                          ? t('billing.plan.used', { used: String(l.used), cap: String(l.cap) })
                          : t('billing.plan.usedNoLimit', { used: String(l.used) }),
                  })}
                </li>
              ))}
            </ul>
            {plan.features.length > 0 && (
              <>
                <h2 className="mt-3 text-sm font-medium">{t('billing.plan.features')}</h2>
                <ul className="mt-1 list-disc pl-5 text-sm" aria-label={t('billing.plan.features')}>
                  {planFeatures(plan, catalogue).map((f) => (
                    <li key={f.key}>{sentenceCase(f.label)}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        <ul className="mt-3 space-y-1 text-sm">
          {account.next_band && (
            <li className="text-muted-foreground">
              {price(account.next_band)
                ? t('billing.plan.next', {
                    band: label(account.next_band),
                    price: price(account.next_band),
                  })
                : t('billing.plan.nextNoPrice', { band: label(account.next_band) })}
            </li>
          )}
        </ul>
        {account.pending_band && (
          <Alert variant="info" className="mt-3">
            {t('billing.banner.pending', {
              band: label(account.pending_band),
              date: date(account.period_end),
            })}{' '}
            <Button size="sm" variant="ghost" onClick={() => void cancelPending()}>
              {t('billing.banner.cancel')}
            </Button>
          </Alert>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Select
            label={t('billing.plan.change')}
            value={choice}
            onChange={(e) => setChoice(e.target.value as Band)}
          >
            <option value="">{t('billing.plan.choose')}</option>
            {offeredBands(account).map((b) => (
              <option key={b} value={b}>
                {label(b)} {price(b)}
              </option>
            ))}
          </Select>
          <Button disabled={!choice || busy} onClick={() => choice && void ask(choice)}>
            {t('billing.plan.review')}
          </Button>
          {account.trial_available && (
            <Button variant="secondary" onClick={() => void trial()}>
              {t('billing.trial.start')}
            </Button>
          )}
        </div>
      </Card>

      <Card header={t('billing.payment.title')}>
        <p className="mb-2 text-sm">
          {account.card
            ? t('billing.payment.card', { brand: account.card.brand, last4: account.card.last4 })
            : t('billing.payment.none')}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">{t('billing.payment.hosted')}</p>
        <Button size="sm" disabled={busy} onClick={() => void addCard()}>
          {account.card ? t('billing.payment.replace') : t('billing.payment.add')}
        </Button>
        <div className="mt-4">
          <Toggle
            label={t('billing.auto.label')}
            help={
              account.can_manage_auto_upgrade ? t('billing.auto.help') : t('billing.auto.ownerOnly')
            }
            checked={account.auto_upgrade}
            disabled={!account.can_manage_auto_upgrade}
            onChange={(e) => void autoUpgrade(e.target.checked)}
          />
        </div>
      </Card>

      <Card header={t('billing.invoices.title')}>
        <Table
          caption={t('billing.invoices.title')}
          columns={columns}
          rows={invoices ?? []}
          rowKey={(i) => i.id}
          loading={invoices === null}
          empty={t('billing.invoices.none')}
        />
      </Card>

      <Modal
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? t('billing.confirm.title', { band: label(confirm.band) }) : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button disabled={busy} onClick={() => void change()}>
              {t('billing.confirm.go')}
            </Button>
          </>
        }
      >
        {confirm?.now ? (
          <p>
            {confirm.amount
              ? t('billing.confirm.up', { amount: confirm.amount })
              : t('billing.confirm.upNoAmount')}
          </p>
        ) : (
          <>
            <p>{t('billing.confirm.down', { date: date(account.period_end) })}</p>
            {confirm && confirm.consequences.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {confirm.consequences.map((c) => (
                  <li key={c.code}>{c.message}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
