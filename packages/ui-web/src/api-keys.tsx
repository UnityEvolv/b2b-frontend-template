import type { Api, authorization, identity } from '@b2b-template/api'
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
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export type ApiKey = identity.components['schemas']['ApiKey']
type PermissionGroup = authorization.components['schemas']['PermissionGroup']

/** Whose keys a page manages: the org's (every key and token in it), or the person's own tokens. */
export type ApiKeyKind = 'org' | 'personal'

/**
 * Groups a key is never granted, whoever makes it: a key never makes or
 * revokes keys (`api_keys`), and the org's settings stay a person's. The
 * Owner-only actions are the registry's `owner_only`, left out too.
 */
export const NEVER_GRANTED: readonly string[] = ['api_keys', 'settings']

/**
 * The groups a person may put on a key: the registry's, each one they hold
 * now, never one of `NEVER_GRANTED` or an Owner-only action. The identity
 * service refuses any other.
 */
export function grantableGroups(
  groups: readonly PermissionGroup[],
  ownerOnly: readonly string[],
  can: (group: string) => boolean,
): PermissionGroup[] {
  return groups.filter(
    (g) => can(g.key) && !NEVER_GRANTED.includes(g.key) && !ownerOnly.includes(g.key),
  )
}

/** Where a key stands now: revoked, past its end, or working. */
export function keyState(key: ApiKey, now: Date): 'revoked' | 'expired' | 'active' {
  if (key.revoked_at) return 'revoked'
  if (key.expires_at && new Date(key.expires_at).getTime() <= now.getTime()) return 'expired'
  return 'active'
}

/** The form as typed. */
export interface NewKeyForm {
  name: string
  groups: string[]
  /** The last day it works, `yyyy-mm-dd`, or empty for no end. */
  expiresOn: string
}

export type NewKeyError = 'name' | 'groups' | 'expiresOn'

/**
 * The request a form makes, or the first field that is wrong: a name of 1 to
 * 100 characters, at least one group, and an end, when given, still ahead
 * (the close of that day, in the viewer's time zone). The service checks the
 * same and more.
 */
export function newKeyRequest(
  form: NewKeyForm,
  now: Date,
): { name: string; groups: string[]; expires_at?: string } | { error: NewKeyError } {
  const name = form.name.trim()
  if (!name || name.length > 100) return { error: 'name' }
  if (form.groups.length === 0) return { error: 'groups' }
  if (!form.expiresOn) return { name, groups: form.groups }
  const ends = /^\d{4}-\d{2}-\d{2}$/.test(form.expiresOn)
    ? new Date(`${form.expiresOn}T23:59:59`)
    : null
  if (!ends || Number.isNaN(ends.getTime()) || ends.getTime() <= now.getTime()) {
    return { error: 'expiresOn' }
  }
  return { name, groups: form.groups, expires_at: ends.toISOString() }
}

const EMPTY: NewKeyForm = { name: '', groups: [], expiresOn: '' }

interface Refusal {
  code?: string
  message?: string
}

/**
 * Keys for scripts: the org's API keys (with `kind` org, for whoever holds
 * `api_keys`; the list has every person's tokens in the org too) or the
 * person's own personal access tokens. Lists them with their prefix, groups
 * and dates, makes one, showing its token this once, and revokes one after
 * asking. The token is held only while its dialog is open and dropped when
 * it closes. Whether the plan includes API access is the identity service's
 * to say; its refusal is shown, with a way to the plan when the page has one.
 */
export function ApiKeysPanel({
  api,
  orgId,
  kind,
  can,
  billingPath,
}: {
  api: Api
  orgId: string
  kind: ApiKeyKind
  /** Whether the viewer holds a permission group now (`useSession().permissions.can`). */
  can: (group: string) => boolean
  /** Where the plan is changed, when the viewer may: shown with a plan refusal. */
  billingPath?: string
}) {
  const { t, i18n } = useTranslation('common')
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [registry, setRegistry] = useState<{ groups: PermissionGroup[]; ownerOnly: string[] }>()
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState<NewKeyForm | null>(null)
  const [invalid, setInvalid] = useState<NewKeyError | null>(null)
  const [busy, setBusy] = useState(false)
  const [planRefused, setPlanRefused] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const path = { org_id: orgId }

  useEffect(() => {
    let current = true
    const list =
      kind === 'org'
        ? api.identity.GET('/v1/organizations/{org_id}/api-keys', {
            params: { path: { org_id: orgId } },
          })
        : api.identity.GET('/v1/organizations/{org_id}/personal-access-tokens', {
            params: { path: { org_id: orgId } },
          })
    void list.then(({ data }) => {
      if (!current) return
      setFailed(!data)
      setKeys(data?.keys ?? [])
    })
    return () => {
      current = false
    }
  }, [api, orgId, kind, version])

  useEffect(() => {
    let current = true
    void api.authorization.GET('/v1/permission-groups').then(({ data }) => {
      if (current) setRegistry({ groups: data?.groups ?? [], ownerOnly: data?.owner_only ?? [] })
    })
    return () => {
      current = false
    }
  }, [api])

  if (failed) return <Alert variant="danger">{t('apiKeys.failed')}</Alert>
  if (!keys || !registry) return <Spinner block size="lg" label={t('loading')} />

  const grantable = grantableGroups(registry.groups, registry.ownerOnly, can)
  const groupLabel = (key: string) => registry.groups.find((g) => g.key === key)?.label ?? key
  const date = (at: string) =>
    new Date(at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const now = new Date()
  const reload = () => setVersion((v) => v + 1)

  const create = async () => {
    if (!form) return
    const request = newKeyRequest(form, new Date())
    if ('error' in request) {
      setInvalid(request.error)
      return
    }
    setInvalid(null)
    setBusy(true)
    const { data, error } =
      kind === 'org'
        ? await api.identity.POST('/v1/organizations/{org_id}/api-keys', {
            params: { path },
            body: request,
          })
        : await api.identity.POST('/v1/organizations/{org_id}/personal-access-tokens', {
            params: { path },
            body: request,
          })
    setBusy(false)
    if (!data) {
      const refusal = error as Refusal | undefined
      if (refusal?.code === 'plan.limit_reached') {
        setForm(null)
        setPlanRefused(true)
        return
      }
      toast.error(refusal?.message ?? t('apiKeys.createFailed'))
      return
    }
    setForm(null)
    setPlanRefused(false)
    setToken(data.token)
    reload()
  }

  const revoke = async () => {
    if (!revoking) return
    setBusy(true)
    const params = { params: { path: { org_id: orgId, key_id: revoking.id } } }
    const { error } =
      kind === 'org'
        ? await api.identity.DELETE('/v1/organizations/{org_id}/api-keys/{key_id}', params)
        : await api.identity.DELETE(
            '/v1/organizations/{org_id}/personal-access-tokens/{key_id}',
            params,
          )
    setBusy(false)
    setRevoking(null)
    if (error) toast.error((error as Refusal).message ?? t('apiKeys.revokeFailed'))
    else toast.success(t('apiKeys.revoked'))
    reload()
  }

  const copy = async () => {
    if (!token) return
    await navigator.clipboard.writeText(token)
    toast.success(t('apiKeys.copied'))
  }

  const columns: TableColumn<ApiKey>[] = [
    {
      key: 'name',
      header: t('apiKeys.name'),
      card: 'title',
      cell: (k) => (
        <span className="flex flex-wrap items-center gap-2">
          {k.name}
          {kind === 'org' && k.kind === 'personal' && (
            <Badge variant="secondary">{t('apiKeys.personalBadge')}</Badge>
          )}
        </span>
      ),
    },
    { key: 'prefix', header: t('apiKeys.prefix'), cell: (k) => <code>{k.prefix}…</code> },
    {
      key: 'groups',
      header: t('apiKeys.groups'),
      cell: (k) => k.groups.map(groupLabel).join(', '),
    },
    { key: 'created', header: t('apiKeys.created'), cell: (k) => date(k.created_at) },
    {
      key: 'used',
      header: t('apiKeys.lastUsed'),
      cell: (k) => (k.last_used_at ? date(k.last_used_at) : t('apiKeys.never')),
    },
    {
      key: 'expires',
      header: t('apiKeys.expires'),
      cell: (k) => (k.expires_at ? date(k.expires_at) : t('apiKeys.noExpiry')),
    },
    {
      key: 'state',
      header: t('apiKeys.state'),
      cell: (k) => {
        const state = keyState(k, now)
        return (
          <Badge variant={state === 'active' ? 'primary' : 'secondary'}>
            {state === 'revoked' && k.revoked_at
              ? t('apiKeys.revokedOn', { date: date(k.revoked_at) })
              : t(`apiKeys.states.${state}`)}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: t('apiKeys.actions'),
      cell: (k) =>
        k.revoked_at ? null : (
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('apiKeys.revokeOne', { name: k.name })}
            onClick={() => setRevoking(k)}
          >
            {t('apiKeys.revoke')}
          </Button>
        ),
    },
  ]

  return (
    <Card header={t(`apiKeys.${kind}.listTitle`)}>
      {planRefused && (
        <Alert variant="warn" className="mb-3">
          {t('apiKeys.planRefused')}{' '}
          {billingPath ? (
            <Link className="link" to={billingPath}>
              {t('apiKeys.seePlan')}
            </Link>
          ) : (
            t('apiKeys.askAdmin')
          )}
        </Alert>
      )}
      <Table
        caption={t(`apiKeys.${kind}.listTitle`)}
        columns={columns}
        rows={keys}
        rowKey={(k) => k.id}
        empty={t(`apiKeys.${kind}.empty`)}
      />
      <div className="mt-3">
        <Button
          disabled={grantable.length === 0}
          onClick={() => {
            setInvalid(null)
            setForm(EMPTY)
          }}
        >
          {t(`apiKeys.${kind}.create`)}
        </Button>
        {grantable.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">{t('apiKeys.nothingToGrant')}</p>
        )}
      </div>

      <Modal
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        title={t(`apiKeys.${kind}.create`)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t('cancel')}
            </Button>
            <Button disabled={busy} onClick={() => void create()}>
              {t('apiKeys.createSubmit')}
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
              void create()
            }}
          >
            <Input
              label={t('apiKeys.name')}
              help={t('apiKeys.nameHelp')}
              value={form.name}
              maxLength={100}
              error={invalid === 'name' ? t('apiKeys.errors.name') : undefined}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('apiKeys.groups')}</legend>
              <p className="text-xs text-muted-foreground">{t(`apiKeys.${kind}.groupsHelp`)}</p>
              {grantable.map((g) => (
                <Checkbox
                  key={g.key}
                  label={g.label}
                  help={g.description}
                  checked={form.groups.includes(g.key)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      groups: e.target.checked
                        ? [...form.groups, g.key]
                        : form.groups.filter((x) => x !== g.key),
                    })
                  }
                />
              ))}
              {invalid === 'groups' && <Alert variant="danger">{t('apiKeys.errors.groups')}</Alert>}
            </fieldset>
            <Input
              label={t('apiKeys.expiresLabel')}
              help={t('apiKeys.expiresHelp')}
              type="date"
              value={form.expiresOn}
              error={invalid === 'expiresOn' ? t('apiKeys.errors.expiresOn') : undefined}
              onChange={(e) => setForm({ ...form, expiresOn: e.target.value })}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={token !== null}
        onOpenChange={(open) => !open && setToken(null)}
        title={t(`apiKeys.${kind}.newTitle`)}
        footer={<Button onClick={() => setToken(null)}>{t('apiKeys.done')}</Button>}
      >
        <Alert variant="warn">{t('apiKeys.once')}</Alert>
        <div className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={t('apiKeys.token')}
              value={token ?? ''}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <Button variant="secondary" onClick={() => void copy()}>
            {t('apiKeys.copy')}
          </Button>
        </div>
      </Modal>

      <Modal
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={t('apiKeys.revokeTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              {t('cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void revoke()}>
              {t('apiKeys.revoke')}
            </Button>
          </>
        }
      >
        {revoking && (
          <Alert variant="warn">{t('apiKeys.revokeConfirm', { name: revoking.name })}</Alert>
        )}
      </Modal>
    </Card>
  )
}
