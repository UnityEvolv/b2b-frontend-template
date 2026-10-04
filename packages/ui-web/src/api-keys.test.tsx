// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { Toaster } from '@unityevolv/unitykit'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import {
  ApiKeysPanel,
  grantableGroups,
  keyState,
  newKeyRequest,
  type ApiKey,
  type ApiKeyKind,
} from './api-keys'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const group = (key: string, label: string) => ({
  key,
  label,
  description: '',
  default_roles: ['admin' as const],
})

/** The registry: the template's groups and a product's (projects). */
const REGISTRY = {
  groups: [
    group('users', 'Users'),
    group('billing', 'Billing'),
    group('audit', 'Audit log'),
    group('api_keys', 'API keys'),
    group('projects', 'Projects'),
  ],
  owner_only: ['assign_roles', 'configure_permissions'],
}

const key = (over: Partial<ApiKey>): ApiKey => ({
  id: 'k-1',
  org_id: 'org-1',
  kind: 'org',
  name: 'nightly sync',
  prefix: 'b2bapp_ak_x9Qe2L',
  groups: ['users'],
  created_by: 'membership:m-1',
  created_at: '2026-09-01T09:00:00Z',
  ...over,
})

const KEYS = [
  key({ last_used_at: '2026-10-01T08:00:00Z', expires_at: '2027-01-01T00:00:00Z' }),
  key({
    id: 'k-2',
    kind: 'personal',
    name: 'my laptop',
    prefix: 'b2bapp_pat_Hk2',
    groups: ['users', 'projects'],
    membership_id: 'm-2',
  }),
  key({ id: 'k-3', name: 'old import', revoked_at: '2026-09-20T10:00:00Z' }),
]

const TOKEN = 'b2bapp_ak_NEWSECRETxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

interface Call {
  method: string
  path: string
  body?: unknown
}

function renderPanel({
  kind = 'org',
  held = ['users', 'audit', 'api_keys', 'settings', 'projects', 'assign_roles'],
  billingPath,
  create,
}: {
  kind?: ApiKeyKind
  held?: string[]
  billingPath?: string
  create?: () => Response
} = {}) {
  const calls: Call[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    const text = input.method === 'POST' ? await input.text() : ''
    calls.push({ method: input.method, path, ...(text ? { body: JSON.parse(text) } : {}) })
    if (path.endsWith('/permission-groups')) return json(REGISTRY)
    if (input.method === 'GET') return json({ keys: KEYS })
    if (input.method === 'POST') {
      if (create) return create()
      const body = JSON.parse(text) as { name: string; groups: string[] }
      return json({ key: key({ id: 'k-new', ...body }), token: TOKEN }, 201)
    }
    if (input.method === 'DELETE') return new Response(null, { status: 204 })
    return new Response(null, { status: 404 })
  }
  const api = createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch })
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter>
        <ApiKeysPanel
          api={api}
          orgId="org-1"
          kind={kind}
          can={(g) => held.includes(g)}
          {...(billingPath ? { billingPath } : {})}
        />
        <Toaster />
      </MemoryRouter>
    </I18nextProvider>,
  )
  return calls
}

async function openCreate(name = 'Create an API key') {
  fireEvent.click(await screen.findByRole('button', { name }))
  return screen.findByRole('dialog')
}

describe('which groups a key may be given', () => {
  it('is those the maker holds, never api_keys, settings or an Owner-only action', () => {
    const held = ['users', 'api_keys', 'settings', 'projects', 'assign_roles']
    const all = [
      ...REGISTRY.groups,
      group('settings', 'Settings'),
      group('assign_roles', 'Assign roles'),
    ]
    expect(
      grantableGroups(all, REGISTRY.owner_only, (g) => held.includes(g)).map((g) => g.key),
    ).toEqual(['users', 'projects'])
  })
})

describe('a new key’s request', () => {
  const now = new Date('2026-10-05T12:00:00')
  it('needs a name, a group, and an end still ahead when one is given', () => {
    expect(newKeyRequest({ name: ' ', groups: ['users'], expiresOn: '' }, now)).toEqual({
      error: 'name',
    })
    expect(newKeyRequest({ name: 'x'.repeat(101), groups: ['users'], expiresOn: '' }, now)).toEqual(
      { error: 'name' },
    )
    expect(newKeyRequest({ name: 'sync', groups: [], expiresOn: '' }, now)).toEqual({
      error: 'groups',
    })
    expect(
      newKeyRequest({ name: 'sync', groups: ['users'], expiresOn: '2026-10-04' }, now),
    ).toEqual({ error: 'expiresOn' })
    expect(newKeyRequest({ name: ' sync ', groups: ['users'], expiresOn: '' }, now)).toEqual({
      name: 'sync',
      groups: ['users'],
    })
    expect(
      newKeyRequest({ name: 'sync', groups: ['users'], expiresOn: '2026-10-05' }, now),
    ).toEqual({
      name: 'sync',
      groups: ['users'],
      expires_at: new Date('2026-10-05T23:59:59').toISOString(),
    })
  })

  it('tells revoked and expired keys from working ones', () => {
    const now = new Date('2026-10-05T12:00:00Z')
    expect(keyState(key({}), now)).toBe('active')
    expect(keyState(key({ expires_at: '2026-10-01T00:00:00Z' }), now)).toBe('expired')
    expect(keyState(key({ revoked_at: '2026-10-01T00:00:00Z' }), now)).toBe('revoked')
  })
})

describe('the org’s API keys', () => {
  it('lists every key and token: name, prefix, permissions by label, and its state', async () => {
    renderPanel()
    const sync = (await screen.findByText('nightly sync')).closest('tr')!
    expect(within(sync).getByText('b2bapp_ak_x9Qe2L…')).toBeTruthy()
    expect(within(sync).getByText('Users')).toBeTruthy()
    expect(within(sync).getByText('Active')).toBeTruthy()
    expect(within(sync).getByRole('button', { name: 'Revoke nightly sync' })).toBeTruthy()
    const laptop = screen.getByText('my laptop').closest('tr')!
    expect(within(laptop).getByText('Personal')).toBeTruthy()
    expect(within(laptop).getByText('Users, Projects')).toBeTruthy()
    // Never used, and no end.
    expect(within(laptop).getAllByText('Never')).toHaveLength(2)
    const old = screen.getByText('old import').closest('tr')!
    expect(within(old).getByText(/^Revoked /)).toBeTruthy()
    expect(within(old).queryByRole('button', { name: /Revoke/ })).toBeNull()
  })

  it('offers only permissions the maker holds, never api_keys, settings or an Owner’s', async () => {
    renderPanel()
    const dialog = await openCreate()
    const offered = within(dialog)
      .getAllByRole('checkbox')
      .map((c) => c.closest('label')?.textContent?.trim())
    expect(offered).toEqual(['Users', 'Audit log', 'Projects'])
  })

  it('shows the token once, and forgets it when the dialog closes', async () => {
    const calls = renderPanel()
    const dialog = await openCreate()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'export' },
    })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Audit log' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    const shown = await screen.findByDisplayValue(TOKEN)
    expect(screen.getByText(/This is the only time it is shown/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/identity/v1/organizations/org-1/api-keys',
      body: { name: 'export', groups: ['audit'] },
    })
    expect(shown).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'I have copied it' }))
    await waitFor(() => expect(screen.queryByDisplayValue(TOKEN)).toBeNull())
    // Nowhere on the page, the list read again included, and not back when another is begun.
    expect(document.body.textContent).not.toContain(TOKEN)
    await openCreate()
    expect(screen.queryByDisplayValue(TOKEN)).toBeNull()
    expect(document.body.innerHTML).not.toContain(TOKEN)
  })

  it('says what is missing before sending', async () => {
    const calls = renderPanel()
    const dialog = await openCreate()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Give it a name of up to 100 characters.')).toBeTruthy()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'export' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Choose at least one permission.')).toBeTruthy()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('explains a plan without API access, with the way to billing', async () => {
    renderPanel({
      billingPath: '/billing',
      create: () =>
        json(
          { code: 'plan.limit_reached', message: 'Your plan does not include API access.' },
          403,
        ),
    })
    const dialog = await openCreate()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'export' },
    })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Users' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(
      await screen.findByText(/Your organization’s plan does not include API access\./),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See the plans' }).getAttribute('href')).toBe(
      '/billing',
    )
    expect(screen.queryByRole('textbox', { name: 'Token' })).toBeNull()
  })

  it('revokes one only after asking', async () => {
    const calls = renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke nightly sync' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/nightly sync stops working at once/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: '/identity/v1/organizations/org-1/api-keys/k-1',
      }),
    )
  })
})

describe('personal access tokens', () => {
  it('lists, makes and revokes the person’s own, limited to what they hold', async () => {
    const calls = renderPanel({ kind: 'personal', held: ['projects'] })
    expect(await screen.findByText('nightly sync')).toBeTruthy()
    expect(calls).toContainEqual({
      method: 'GET',
      path: '/identity/v1/organizations/org-1/personal-access-tokens',
    })
    const dialog = await openCreate('Create a token')
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(1)
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'mine' },
    })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Projects' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(await screen.findByDisplayValue(TOKEN)).toBeTruthy()
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/identity/v1/organizations/org-1/personal-access-tokens',
      body: { name: 'mine', groups: ['projects'] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'I have copied it' }))
    await waitFor(() => expect(screen.queryByDisplayValue(TOKEN)).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Revoke nightly sync' }))
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke' }),
    )
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: '/identity/v1/organizations/org-1/personal-access-tokens/k-1',
      }),
    )
  })

  it('asks a member without billing to see whoever manages it, on a plan refusal', async () => {
    renderPanel({
      kind: 'personal',
      create: () => json({ code: 'plan.limit_reached', message: 'No API access.' }, 403),
    })
    const dialog = await openCreate('Create a token')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'mine' },
    })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Users' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(await screen.findByText(/Ask whoever manages billing to change the plan\./)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'See the plans' })).toBeNull()
  })

  it('offers nothing to make when the person holds nothing a token can be given', async () => {
    renderPanel({ kind: 'personal', held: ['settings', 'api_keys'] })
    const create = await screen.findByRole('button', { name: 'Create a token' })
    expect((create as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('You hold no permission a key can be given.')).toBeTruthy()
  })
})
