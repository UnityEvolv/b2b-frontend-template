// @vitest-environment jsdom
import { createApi, type user } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Toaster } from '@unityevolv/unitykit'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SupportSessions } from './SupportSessions'

type Membership = user.components['schemas']['Membership']

const NOW = Date.parse('2026-10-05T12:00:00Z')

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const member = (id: string, name: string, role: string): Membership =>
  ({
    id: `m-${id}`,
    org_id: 'acme',
    user: { id: `u-${id}`, name, email: `${id}@example.org` },
    kind: 'member',
    role,
    status: 'active',
    source: 'invite',
    directory: {},
    created_at: '2026-01-01T00:00:00Z',
    last_modified_at: '2026-01-01T00:00:00Z',
  }) as unknown as Membership

const MEMBERS = [
  member('olu', 'Olu Owner', 'owner'),
  member('ada', 'Ada Admin', 'admin'),
  member('uma', 'Uma User', 'user'),
]

const ORIGINS = { admin: 'https://admin.example.test', account: 'https://account.example.test' }

interface Call {
  method: string
  path: string
  body?: unknown
  credentials: RequestCredentials
}

const grant = (id: string, org: string, includeOwners: boolean) => ({
  id,
  org_id: org,
  granted_by: 'membership:m-olu',
  created_at: '2026-10-05T11:00:00Z',
  expires_at: '2026-10-05T14:00:00Z',
  include_owners: includeOwners,
  active: true,
})

function renderSupport({
  includeOwners = false,
  origins = ORIGINS,
}: { includeOwners?: boolean; origins?: Record<string, string> } = {}) {
  const calls: Call[] = []
  const fetch = async (input: Request) => {
    const url = new URL(input.url)
    const text = input.method === 'POST' ? await input.text() : ''
    calls.push({
      method: input.method,
      path: url.pathname,
      credentials: input.credentials,
      ...(text ? { body: JSON.parse(text) as unknown } : {}),
    })
    if (url.pathname === '/identity/v1/platform/impersonation-grants') {
      return json({
        // Another org's consent is not this one's.
        grants: [grant('g-1', 'acme', includeOwners), grant('g-other', 'other-org', true)],
        standing: [],
      })
    }
    if (url.pathname === '/identity/v1/organizations/acme/impersonations') {
      return json({
        impersonations: [
          {
            id: 'i-1',
            org_id: 'acme',
            grant_id: 'g-0',
            impersonator_id: 'op-7',
            user_id: 'u-ada',
            membership_id: 'm-ada',
            started_at: '2026-10-04T09:00:00Z',
            ends_at: '2026-10-04T10:00:00Z',
            ended_at: '2026-10-04T09:20:00Z',
            ended_reason: 'impersonation_ended',
            active: false,
          },
        ],
      })
    }
    if (url.pathname === '/identity/v1/platform/impersonations') {
      if ((calls.at(-1)?.body as { user_id?: string }).user_id === 'u-olu') {
        return json({ code: 'impersonation.no_consent', message: 'No consent covers them.' }, 403)
      }
      return json(
        {
          impersonation: {
            id: 'i-2',
            org_id: 'acme',
            grant_id: 'g-1',
            impersonator_id: 'op-7',
            user_id: 'u-ada',
            membership_id: 'm-ada',
            started_at: '2026-10-05T12:00:00Z',
            ends_at: '2026-10-05T14:00:00Z',
            active: true,
          },
          token: {
            access_token: 'started-access-value',
            token_type: 'Bearer',
            expires_in: 900,
            user_id: 'u-ada',
            choose_organization: false,
          },
        },
        201,
      )
    }
    return new Response(null, { status: 404 })
  }
  const api = createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch })
  render(
    <I18nextProvider i18n={createI18n()}>
      <SupportSessions
        api={api}
        orgId="acme"
        members={MEMBERS}
        appOrigins={origins}
        now={() => NOW}
      />
      <Toaster />
    </I18nextProvider>,
  )
  return calls
}

/** The browser's window.open, answering with a tab the test can look at. */
function stubOpen() {
  const tab = { opener: {} as unknown, location: { href: 'about:blank' }, close: vi.fn() }
  const open = vi.fn(() => tab as unknown as Window)
  vi.stubGlobal('open', open)
  return { tab, open }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const viewAs = (name: string, app: string) =>
  screen.getByRole('button', { name: `View as ${name}, in the ${app} app` })

describe('support for an organization, for a platform operator', () => {
  it('lists the consent, and who it reaches', async () => {
    renderSupport()
    expect(await screen.findByText(/^Consent open until .*, Owners not included\.$/)).toBeTruthy()
    expect(screen.getByText('No standing support access.')).toBeTruthy()
    const table = within(screen.getByRole('table', { name: 'See as' }))
    expect(table.getByText('Not included: an Owner').closest('tr')?.textContent).toContain(
      'Olu Owner',
    )
    expect(table.getAllByText(/^Consent, until/)).toHaveLength(2)
  })

  it('does not offer to see as an Owner when the consent leaves Owners out', async () => {
    renderSupport()
    await screen.findByText(/^Consent open until/)
    expect(viewAs('Olu Owner', 'admin')).toHaveProperty('disabled', true)
    expect(viewAs('Ada Admin', 'admin')).toHaveProperty('disabled', false)
    expect(viewAs('Uma User', 'account')).toHaveProperty('disabled', false)
  })

  it('offers an Owner when the consent includes Owners', async () => {
    renderSupport({ includeOwners: true })
    await screen.findByText(/^Consent open until/)
    expect(viewAs('Olu Owner', 'admin')).toHaveProperty('disabled', false)
  })

  it('starts the session under the consent, then opens the person’s app marked as support', async () => {
    const { tab, open } = stubOpen()
    const calls = renderSupport()
    await screen.findByText(/^Consent open until/)
    fireEvent.click(viewAs('Ada Admin', 'admin'))

    await waitFor(() => expect(tab.location.href).toBe('https://admin.example.test/?support=1'))
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(tab.opener).toBeNull()
    const start = calls.find((c) => c.path === '/identity/v1/platform/impersonations')!
    expect(start.method).toBe('POST')
    expect(start.body).toEqual({ org_id: 'acme', user_id: 'u-ada', grant_id: 'g-1' })
    // The support cookie is set on the API host.
    expect(start.credentials).toBe('include')
    // The token the start answers with is never kept.
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('started-access-value')
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('started-access-value')
  })

  it('opens a member in the account app', async () => {
    const { tab } = stubOpen()
    renderSupport()
    await screen.findByText(/^Consent open until/)
    fireEvent.click(viewAs('Uma User', 'account'))
    await waitFor(() => expect(tab.location.href).toBe('https://account.example.test/?support=1'))
  })

  it('closes the tab it opened when the start is refused', async () => {
    const { tab } = stubOpen()
    renderSupport({ includeOwners: true })
    await screen.findByText(/^Consent open until/)
    // Offered, but refused by the server: the consent was withdrawn meanwhile.
    fireEvent.click(viewAs('Olu Owner', 'admin'))
    await waitFor(() => expect(tab.close).toHaveBeenCalled())
    expect(tab.location.href).toBe('about:blank')
    expect(await screen.findAllByText('No consent covers them.')).not.toHaveLength(0)
  })

  it('does not offer an app whose address the build lacks', async () => {
    renderSupport({ origins: { admin: ORIGINS.admin } })
    await screen.findByText(/^Consent open until/)
    expect(viewAs('Uma User', 'account')).toHaveProperty('disabled', true)
  })

  it('lists the organization’s support sessions', async () => {
    renderSupport()
    const past = within(
      await screen.findByRole('table', { name: 'Past and active support sessions' }),
    )
    expect(past.getByText('Ada Admin')).toBeTruthy()
    expect(past.getByText('op-7')).toBeTruthy()
    expect(past.getByText(/^Ended /)).toBeTruthy()
  })
})
