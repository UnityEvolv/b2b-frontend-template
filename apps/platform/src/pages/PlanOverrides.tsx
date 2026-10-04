import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  Table,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { Api } from '@b2b-template/api'
import { sentenceCase, type PlanCatalogue } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  EMPTY_FORM,
  formFrom,
  overrideRequest,
  overrideTargets,
  type OverrideForm,
  type OverrideFormError,
  type PlanOverride,
} from './overrides'

const message = (error: unknown) => (error as { message?: string } | undefined)?.message

/**
 * An organization's exceptions to its band, for an enterprise deal: a
 * limit's cap or a feature, set on any limit or feature the deployment
 * registers, each with an optional last day. An override past its end is
 * listed as ended until it is removed or set again; nothing sweeps it. The
 * organization service audits every change on the org.
 */
export function PlanOverrides({
  api,
  orgId,
  catalogue,
  onChanged,
}: {
  api: Api
  orgId: string
  catalogue: PlanCatalogue | null
  /** After a change, so the page reads the org again (its seat cap may have moved). */
  onChanged?: () => void
}) {
  const { t, i18n } = useTranslation('platform')
  const [overrides, setOverrides] = useState<PlanOverride[] | null>(null)
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState<OverrideForm | null>(null)
  const [editing, setEditing] = useState(false)
  const [invalid, setInvalid] = useState<OverrideFormError | null>(null)
  const [removing, setRemoving] = useState<PlanOverride | null>(null)
  const [busy, setBusy] = useState(false)
  const targets = overrideTargets(catalogue)

  useEffect(() => {
    let current = true
    void api.organization
      .GET('/v1/organizations/{org_id}/plan-overrides', { params: { path: { org_id: orgId } } })
      .then(({ data }) => current && setOverrides(data?.overrides ?? []))
    return () => {
      current = false
    }
  }, [api, orgId, version])

  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const labelOf = (o: Pick<PlanOverride, 'kind' | 'key'>) =>
    sentenceCase(targets.find((x) => x.kind === o.kind && x.key === o.key)?.label ?? o.key)
  const valueOf = (o: PlanOverride) =>
    o.kind === 'limit'
      ? o.cap
        ? t('overrides.cap', { cap: String(o.cap) })
        : t('overrides.noCap')
      : o.allowed
        ? t('overrides.granted')
        : t('overrides.takenAway')
  const changed = () => {
    setVersion((v) => v + 1)
    onChanged?.()
  }

  const save = async () => {
    if (!form) return
    const request = overrideRequest(form, targets, new Date())
    if ('error' in request) {
      setInvalid(request.error)
      return
    }
    setInvalid(null)
    setBusy(true)
    const { data, error } = await api.organization.PUT(
      '/v1/organizations/{org_id}/plan-overrides/{kind}/{key}',
      {
        params: { path: { org_id: orgId, kind: request.kind, key: request.key } },
        body: request.body,
      },
    )
    setBusy(false)
    if (!data) {
      toast.error(message(error) ?? t('overrides.saveFailed'))
      return
    }
    toast.success(t('overrides.saved'))
    setForm(null)
    changed()
  }

  const remove = async () => {
    if (!removing) return
    setBusy(true)
    const { error } = await api.organization.DELETE(
      '/v1/organizations/{org_id}/plan-overrides/{kind}/{key}',
      { params: { path: { org_id: orgId, kind: removing.kind, key: removing.key } } },
    )
    setBusy(false)
    setRemoving(null)
    if (error) {
      toast.error(message(error) ?? t('overrides.removeFailed'))
      return
    }
    toast.success(t('overrides.removed'))
    changed()
  }

  const columns: TableColumn<PlanOverride>[] = [
    { key: 'what', header: t('overrides.what'), card: 'title', cell: labelOf },
    { key: 'value', header: t('overrides.value'), cell: valueOf },
    {
      key: 'ends',
      header: t('overrides.ends'),
      cell: (o) =>
        o.ends_at
          ? t('overrides.until', { date: date.format(new Date(o.ends_at)) })
          : t('overrides.noEnd'),
    },
    {
      key: 'state',
      header: t('overrides.state'),
      cell: (o) => (
        <Badge variant={o.in_force ? 'primary' : 'secondary'}>
          {o.in_force ? t('overrides.inForce') : t('overrides.ended')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('overrides.actions'),
      cell: (o) => (
        <span className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('overrides.editOne', { what: labelOf(o) })}
            onClick={() => {
              setInvalid(null)
              setEditing(true)
              setForm(formFrom(o))
            }}
          >
            {t('overrides.edit')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('overrides.removeOne', { what: labelOf(o) })}
            onClick={() => setRemoving(o)}
          >
            {t('overrides.remove')}
          </Button>
        </span>
      ),
    },
  ]

  const target = form ? targets.find((x) => x.value === form.target) : undefined
  const edit = (patch: Partial<OverrideForm>) => setForm((f) => (f ? { ...f, ...patch } : f))

  return (
    <Card header={t('overrides.title')}>
      <p className="mb-3 text-sm">{t('overrides.intro')}</p>
      <Table
        caption={t('overrides.title')}
        columns={columns}
        rows={overrides ?? []}
        rowKey={(o) => `${o.kind}:${o.key}`}
        loading={overrides === null}
        empty={t('overrides.empty')}
      />
      <div className="mt-3">
        <Button
          variant="secondary"
          disabled={targets.length === 0}
          onClick={() => {
            setInvalid(null)
            setEditing(false)
            setForm(EMPTY_FORM)
          }}
        >
          {t('overrides.add')}
        </Button>
      </div>

      <Modal
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        title={editing ? t('overrides.editTitle') : t('overrides.addTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {t('overrides.save')}
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
            <Select
              label={t('overrides.what')}
              value={form.target}
              disabled={editing}
              error={invalid === 'target' ? t('overrides.errors.target') : undefined}
              onChange={(e) => edit({ target: e.target.value })}
            >
              <option value="">{t('overrides.choose')}</option>
              {targets.some((x) => x.kind === 'limit') && (
                <optgroup label={t('overrides.limits')}>
                  {targets
                    .filter((x) => x.kind === 'limit')
                    .map((x) => (
                      <option key={x.value} value={x.value}>
                        {sentenceCase(x.label)}
                      </option>
                    ))}
                </optgroup>
              )}
              {targets.some((x) => x.kind === 'feature') && (
                <optgroup label={t('overrides.features')}>
                  {targets
                    .filter((x) => x.kind === 'feature')
                    .map((x) => (
                      <option key={x.value} value={x.value}>
                        {sentenceCase(x.label)}
                      </option>
                    ))}
                </optgroup>
              )}
            </Select>
            {target?.kind === 'limit' && (
              <>
                <Checkbox
                  label={t('overrides.noCapLabel')}
                  checked={form.noCap}
                  onChange={(e) => edit({ noCap: e.target.checked })}
                />
                {!form.noCap && (
                  <Input
                    label={t('overrides.capLabel')}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={form.cap}
                    error={invalid === 'cap' ? t('overrides.errors.cap') : undefined}
                    onChange={(e) => edit({ cap: e.target.value })}
                  />
                )}
              </>
            )}
            {target?.kind === 'feature' && (
              <Select
                label={t('overrides.allowedLabel')}
                value={form.allowed}
                onChange={(e) => edit({ allowed: e.target.value === 'false' ? 'false' : 'true' })}
              >
                <option value="true">{t('overrides.grant')}</option>
                <option value="false">{t('overrides.takeAway')}</option>
              </Select>
            )}
            <Input
              label={t('overrides.endsLabel')}
              help={t('overrides.endsHelp')}
              type="date"
              value={form.endsOn}
              error={invalid === 'endsOn' ? t('overrides.errors.endsOn') : undefined}
              onChange={(e) => edit({ endsOn: e.target.value })}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('overrides.removeTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              {t('overrides.remove')}
            </Button>
          </>
        }
      >
        {removing && (
          <Alert variant="warn">{t('overrides.removeConfirm', { what: labelOf(removing) })}</Alert>
        )}
      </Modal>
    </Card>
  )
}
