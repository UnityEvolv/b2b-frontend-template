import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Select,
  Table,
  Textarea,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { identity, user } from '@b2b-template/api'
import { assignableRoles, useOrg } from '@b2b-template/ui-web'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

type Invite = identity.components['schemas']['Invite']
type Checked = user.components['schemas']['ImportRow']

/** The addresses in whatever was pasted: commas, semicolons, spaces, lines. */
export function parseAddresses(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** A sheet the import endpoint reads, one row per address. */
function asSheet(addresses: string[], role: string): Blob {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [
    'email,name,role',
    ...addresses.map((a) => [a, a.split('@')[0] ?? a, role].map(quote).join(',')),
  ]
  return new Blob([lines.join('\n')], { type: 'text/csv' })
}

/**
 * Inviting people. The addresses are checked by the server before
 * anything is sent (the bulk import's dry run: malformed, duplicate, already
 * a member, and the plan's user cap, naming the next plan), so the form says
 * what would fail rather than failing after submission. Then the invites go,
 * and pending ones can be resent or withdrawn below.
 */
export default function InviteUsersPage() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const roles = org ? assignableRoles(org.role) : []
  const [text, setText] = useState('')
  const [role, setRole] = useState(roles[roles.length - 1] ?? 'user')
  const [checked, setChecked] = useState<Checked[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Invite[]>([])
  const [loadingPending, setLoadingPending] = useState(true)

  const [version, setVersion] = useState(0)
  const loadPending = () => setVersion((v) => v + 1)
  const orgId = org?.orgId
  const api = org?.api

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void api.identity
      .GET('/v1/organizations/{org_id}/invites', {
        params: { path: { org_id: orgId }, query: { status: 'pending', limit: 200 } },
      })
      .then(({ data }) => {
        if (!current) return
        setPending(data?.invites ?? [])
        setLoadingPending(false)
      })
    return () => {
      current = false
    }
  }, [api, orgId, version])

  if (!org) return <EmptyState icon="invite" titleAs="h2" title={t('users.empty')} />
  if (roles.length === 0) return <Alert variant="warn">{t('invite.notAllowed')}</Alert>

  const addresses = parseAddresses(text)
  const alreadyInvited = new Set(pending.map((i) => i.email))

  /** Send the sheet to the import endpoint, as a check or for real. */
  const run = async (dryRun: boolean) => {
    const form = new FormData()
    form.append('file', asSheet(addresses, role), 'invites.csv')
    const { data } = await org.api.user.POST('/v1/organizations/{org_id}/imports', {
      params: { path: { org_id: org.orgId }, query: { dry_run: dryRun } },
      body: form as never,
      bodySerializer: (body: unknown) => body as FormData,
    })
    if (!data) throw new Error('import refused')
    return data
  }

  const check = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setChecked((await run(true)).rows)
    } catch {
      setError(t('invite.failed'))
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await run(false)
      toast.success(t('invite.sent', { count: result.summary.invited }))
      setChecked(result.rows.filter((r) => r.status === 'failed'))
      setText('')
      loadPending()
    } catch {
      setError(t('invite.failed'))
    } finally {
      setBusy(false)
    }
  }

  const act = async (invite: Invite, action: 'resend' | 'revoke') => {
    const params = { params: { path: { org_id: org.orgId, invite_id: invite.invite_id } } }
    const { error: failed } =
      action === 'resend'
        ? await org.api.identity.POST(
            '/v1/organizations/{org_id}/invites/{invite_id}/resend',
            params,
          )
        : await org.api.identity.DELETE('/v1/organizations/{org_id}/invites/{invite_id}', params)
    if (failed) toast.error(t('invite.actionFailed'))
    else toast.success(t(action === 'resend' ? 'invite.resent' : 'invite.revoked'))
    loadPending()
  }

  const valid = checked?.filter((r) => r.status === 'would_invite').length ?? 0
  const pendingColumns: TableColumn<Invite>[] = [
    { key: 'email', header: t('users.columns.email'), card: 'title' },
    {
      key: 'role',
      header: t('users.columns.role'),
      cell: (i) => t(`roles.${i.role}` as never, { ns: 'common' }),
    },
    {
      key: 'expires_at',
      header: t('invite.expires'),
      cell: (i) => new Date(i.expires_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: t('invite.actions'),
      cell: (i) => (
        <span className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => void act(i, 'resend')}>
            {t('invite.resend')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void act(i, 'revoke')}>
            {t('invite.revoke')}
          </Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t('invite.title')}</h1>
      <form onSubmit={check} noValidate className="mb-8 max-w-xl space-y-4">
        <Textarea
          label={t('invite.addresses')}
          help={t('invite.addressesHelp')}
          rows={4}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setChecked(null)
          }}
        />
        <Select
          label={t('users.columns.role')}
          value={role}
          onChange={(e) => (setRole(e.target.value), setChecked(null))}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}` as never, { ns: 'common' })}
            </option>
          ))}
        </Select>
        {error && <Alert variant="danger">{error}</Alert>}
        {checked === null ? (
          <Button type="submit" disabled={busy || addresses.length === 0}>
            {t('invite.check')}
          </Button>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-1 text-sm" aria-label={t('invite.checked')}>
              {checked.map((row) => (
                <li key={row.row} className="flex items-center gap-2">
                  <Badge variant={row.status === 'failed' ? 'danger' : 'primary'}>
                    {t(row.status === 'failed' ? 'invite.wontSend' : 'invite.willSend')}
                  </Badge>
                  <span>{row.email}</span>
                  {row.errors[0] && (
                    <span className="text-base-content/70">{row.errors[0].message}</span>
                  )}
                  {row.status !== 'failed' &&
                    row.email &&
                    alreadyInvited.has(row.email.toLowerCase()) && (
                      <span className="text-base-content/70">{t('invite.alreadyInvited')}</span>
                    )}
                </li>
              ))}
            </ul>
            <Button type="button" disabled={busy || valid === 0} onClick={() => void send()}>
              {t('invite.send', { count: valid })}
            </Button>
          </div>
        )}
      </form>
      <h2 className="mb-4 text-xl font-semibold">{t('invite.pending')}</h2>
      <Table
        caption={t('invite.pending')}
        columns={pendingColumns}
        rows={pending}
        rowKey={(i) => i.invite_id}
        loading={loadingPending}
        empty={<EmptyState icon="invite" titleAs="h3" title={t('invite.nonePending')} />}
      />
    </>
  )
}
