import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Select,
  Spinner,
  Table,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { authorization, user } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Config = authorization.components['schemas']['PermissionConfig']
type Permission = authorization.components['schemas']['Permission']
type Transfer = authorization.components['schemas']['OwnershipTransfer']
type Group = authorization.components['schemas']['PermissionGroup']
type Membership = user.components['schemas']['Membership']

/** The configuration with one group switched on or off for one role. */
export function toggled(
  config: Pick<Config, 'admin' | 'billing_admin'>,
  role: 'admin' | 'billing_admin',
  group: Permission,
  on: boolean,
): { admin: Permission[]; billing_admin: Permission[] } {
  const next = { admin: [...config.admin], billing_admin: [...config.billing_admin] }
  next[role] = on ? [...new Set([...next[role], group])] : next[role].filter((p) => p !== group)
  return next
}

/**
 * What the Admin and Billing Admin roles may do, and handing over ownership.
 * Owner only: the route asks for configure_permissions, which no
 * other role can hold. The groups, their names and what they cover are the
 * authorization service's registry (the template's and the product's), read
 * with the page: nothing here lists them.
 */
export default function RolesPage() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const [config, setConfig] = useState<Config | null>(null)
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [members, setMembers] = useState<Membership[]>([])
  const [target, setTarget] = useState('')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const reload = () => setVersion((v) => v + 1)
  const orgId = org?.orgId
  const api = org?.api

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void Promise.all([
      api.authorization.GET('/v1/permission-groups'),
      api.authorization.GET('/v1/organizations/{org_id}/permissions', {
        params: { path: { org_id: orgId } },
      }),
      api.authorization.GET('/v1/organizations/{org_id}/ownership-transfers', {
        params: { path: { org_id: orgId } },
      }),
      api.user.GET('/v1/organizations/{org_id}/memberships', {
        params: { path: { org_id: orgId }, query: { status: 'active', limit: 200 } },
      }),
    ]).then(([g, c, tr, m]) => {
      if (!current) return
      setGroups(g.data?.groups ?? [])
      setConfig(c.data ?? null)
      setTransfers(tr.data?.transfers ?? [])
      setMembers(m.data?.memberships.filter((x) => x.kind !== 'guest' && x.role !== 'owner') ?? [])
    })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  if (!org || !config || !groups) return <Spinner block size="lg" label={t('detail.loading')} />

  const save = async (role: 'admin' | 'billing_admin', group: Permission, on: boolean) => {
    setBusy(true)
    const { data, error } = await org.api.authorization.PUT(
      '/v1/organizations/{org_id}/permissions',
      {
        params: { path: { org_id: org.orgId } },
        body: toggled(config, role, group, on),
      },
    )
    setBusy(false)
    if (error || !data) {
      toast.error((error as { message?: string } | undefined)?.message ?? t('roles.saveFailed'))
      return
    }
    setConfig(data)
    toast.success(t('roles.saved'))
  }

  const requestTransfer = async () => {
    setBusy(true)
    const { error } = await org.api.authorization.POST(
      '/v1/organizations/{org_id}/ownership-transfers',
      {
        params: { path: { org_id: org.orgId } },
        body: { to_membership_id: target },
      },
    )
    setBusy(false)
    if (error) {
      toast.error((error as { message?: string }).message ?? t('roles.transferFailed'))
      return
    }
    toast.success(t('roles.transferSent'))
    setTarget('')
    reload()
  }

  const cancelTransfer = async (transfer: Transfer) => {
    await org.api.authorization.DELETE(
      '/v1/organizations/{org_id}/ownership-transfers/{transfer_id}',
      {
        params: { path: { org_id: org.orgId, transfer_id: transfer.transfer_id } },
      },
    )
    reload()
  }

  type Row = Group
  const rows: Row[] = groups
  const cell = (role: 'admin' | 'billing_admin') => (row: Row) => (
    <Checkbox
      aria-label={t('roles.toggle', {
        role: t(`roles.${role}` as never, { ns: 'common' }),
        group: row.label,
      })}
      checked={config[role].includes(row.key)}
      disabled={busy}
      onChange={(event) => void save(role, row.key, event.target.checked)}
    />
  )
  const columns: TableColumn<Row>[] = [
    {
      key: 'group',
      header: t('roles.group'),
      card: 'title',
      cell: (r) => (
        <span>
          <span className="block">{r.label}</span>
          {r.description && (
            <span className="block text-xs text-muted-foreground">{r.description}</span>
          )}
        </span>
      ),
    },
    {
      key: 'owner',
      header: t('roles.owner', { ns: 'common' }),
      cell: () => <Badge variant="secondary">{t('roles.always')}</Badge>,
    },
    { key: 'admin', header: t('roles.admin', { ns: 'common' }), cell: cell('admin') },
    {
      key: 'billing_admin',
      header: t('roles.billing_admin', { ns: 'common' }),
      cell: cell('billing_admin'),
    },
  ]
  const name = (membershipId: string) =>
    members.find((m) => m.id === membershipId)?.user.name ?? t('roles.someone')

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t('roles.title')}</h1>
      <p className="mb-4 max-w-2xl text-sm">{t('roles.intro')}</p>
      {config.warnings.map((warning) => (
        <Alert key={warning} variant="warn" className="mb-4">
          {warning}
        </Alert>
      ))}
      <Table caption={t('roles.title')} columns={columns} rows={rows} rowKey={(r) => r.key} />

      <Card header={t('roles.transferTitle')} className="mt-8 max-w-xl">
        <p className="mb-4 text-sm">{t('roles.transferIntro')}</p>
        {transfers.length > 0 ? (
          transfers.map((transfer) => (
            <div key={transfer.transfer_id} className="space-y-3">
              <Alert variant="info">
                {t('roles.pending', {
                  name: name(transfer.to_membership_id),
                  until: new Date(transfer.expires_at).toLocaleDateString(),
                })}
              </Alert>
              <Button variant="ghost" onClick={() => void cancelTransfer(transfer)}>
                {t('roles.cancelTransfer')}
              </Button>
            </div>
          ))
        ) : (
          <div className="space-y-3">
            <Select
              label={t('roles.to')}
              value={target}
              placeholder={t('roles.choose')}
              onChange={(e) => setTarget(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name} ({m.user.email})
                </option>
              ))}
            </Select>
            <Button disabled={!target || busy} onClick={() => void requestTransfer()}>
              {t('roles.sendTransfer')}
            </Button>
          </div>
        )}
      </Card>
    </>
  )
}
