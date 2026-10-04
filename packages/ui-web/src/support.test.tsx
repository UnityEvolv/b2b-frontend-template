// @vitest-environment jsdom
import type { EventSourceLike } from '@b2b-template/client'
import { createI18n } from '@b2b-template/i18n'
import { storageKey } from '@b2b-template/product-config'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppDefinition, AppRoute } from './app'
import { createAuth } from './auth'
import { useOrg } from './org'
import { buildRoutes } from './routing'
import { AppProviders } from './start'
import { forgetSupportRequest, supportRequested, useReadOnly } from './support'

type Listener = (event: { data?: unknown }) => void

/** The browser's EventSource, in memory: a test says what the server sends. */
class FakeEventSource implements EventSourceLike {
  static opened: FakeEventSource[] = []
  listeners = new Map<string, Listener[]>()
  closed = false
  constructor(
    public url: string,
    public init?: { withCredentials?: boolean },
  ) {
    FakeEventSource.opened.push(this)
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  close() {
    this.closed = true
  }
  send(type: string, body?: Record<string, unknown>) {
    const data =
      body === undefined ? undefined : JSON.stringify({ type, at: '2026-10-01T00:00:00Z', ...body })
    act(() => {
      for (const listener of this.listeners.get(type) ?? []) listener({ data })
    })
  }
}

const open = () => FakeEventSource.opened.filter((s) => !s.closed)

const ORIGIN = 'https://api.example.test'
const ACCESS = 'support-access-value'
const ENDS_AT = '2030-01-01T15:30:00Z'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * The identity, user and authorization services for a support session:
 * the support refresh answers with the marker, a write is refused
 * read-only, and the test says when it is over.
 */
function supportService() {
  const state = {
    over: null as null | { code: string; message: string },
    calls: [] as string[],
  }
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(String(input), init)
    const url = new URL(request.url)
    const call = `${request.method} ${url.pathname}`
    state.calls.push(call)
    if (call === 'POST /identity/v1/session/impersonation/refresh') {
      if (state.over) return json(401, state.over)
      return json(200, {
        access_token: ACCESS,
        token_type: 'Bearer',
        expires_in: 900,
        user_id: 'u-ada',
        org_id: 'acme',
        membership_id: 'm-ada',
        choose_organization: false,
        impersonation: {
          impersonation_id: 'imp-1',
          impersonator_id: 'op-1',
          grant_id: 'g-1',
          ends_at: ENDS_AT,
          read_only: true,
        },
      })
    }
    if (call === 'POST /identity/v1/session/impersonation/end') {
      state.over = { code: 'impersonation.ended', message: 'over' }
      return new Response(null, { status: 204 })
    }
    if (call === 'GET /user/v1/me') {
      const user = { id: 'u-ada', email: 'ada@example.org', name: 'Ada Lovelace' }
      return json(200, {
        user,
        membership: { id: 'm-ada', org_id: 'acme', role: 'admin', status: 'active', user },
      })
    }
    if (call === 'GET /authorization/v1/organizations/acme/permissions') {
      return json(200, { effective: { admin: ['users', 'settings'] } })
    }
    if (request.method !== 'GET') {
      return json(403, {
        code: 'impersonation.read_only',
        message: 'A support session is read-only.',
      })
    }
    return json(404, { code: 'not_found', message: '' })
  }
  return { state, fetch }
}

/** What the page's form did when it was submitted. */
const submitted = vi.fn()

/** A page with a form and a write that is not a form. */
function SettingsPage() {
  const org = useOrg()
  const readOnly = useReadOnly()
  return (
    <>
      <h1>settings page</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted()
        }}
      >
        <label>
          Name
          <input name="name" />
        </label>
        <button type="submit">Save</button>
      </form>
      <button type="button" disabled={readOnly}>
        Delete
      </button>
      <button
        type="button"
        onClick={() =>
          void org?.api.organization.PATCH('/v1/organizations/{org_id}', {
            params: { path: { org_id: org.orgId } },
            body: { name: 'x' },
          })
        }
      >
        Rename anyway
      </button>
    </>
  )
}
const page = (Component: () => React.JSX.Element) => async () => ({ default: Component })

const ROUTES: AppRoute[] = [
  {
    path: '/settings',
    page: page(SettingsPage),
    nav: { key: 'settings', label: () => 'Settings' },
  },
  {
    path: '/api-keys',
    page: page(() => <h1>keys page</h1>),
    support: false,
    nav: { key: 'api-keys', label: () => 'API keys' },
  },
  { path: '/sign-in', access: 'public', page: page(() => <h1>sign-in page</h1>) },
]

function renderSupport(path = '/settings') {
  const service = supportService()
  submitted.mockClear()
  const auth = createAuth({ app: 'admin', apiOrigin: ORIGIN, fetch: service.fetch, support: true })
  const definition: AppDefinition = {
    app: 'admin',
    navNamespace: 'admin',
    home: '/settings',
    signInPath: '/sign-in',
    routes: ROUTES,
    sessionSource: auth.sessionSource,
    auth,
  }
  const router = createMemoryRouter(buildRoutes(definition), { initialEntries: [path] })
  render(
    <AppProviders definition={definition} i18n={createI18n()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { service, router, auth }
}

beforeEach(() => {
  FakeEventSource.opened = []
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
})

describe('a tab opened for support', () => {
  it('is one when opened with ?support=1, stays one on reload, and stops when forgotten', () => {
    const storage = new Map<string, string>()
    const env = {
      location: { href: 'https://admin.example.test/users?support=1&tab=a#top' },
      history: { replaceState: vi.fn() },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
        removeItem: (key: string) => void storage.delete(key),
      },
    }
    expect(supportRequested(env)).toBe(true)
    // The marker leaves the address, so a copied link is never one.
    expect(env.history.replaceState).toHaveBeenCalledWith(null, '', '/users?tab=a#top')
    // A flag for this tab, never a token.
    expect([...storage.values()]).toEqual(['1'])

    env.location.href = 'https://admin.example.test/users'
    expect(supportRequested(env)).toBe(true)
    forgetSupportRequest(env)
    expect(supportRequested(env)).toBe(false)
  })

  it('is not one otherwise', () => {
    expect(
      supportRequested({ location: { href: 'https://admin.example.test/users?support=0' } }),
    ).toBe(false)
  })
})

describe('support mode in the shell', { timeout: 20_000 }, () => {
  it('shows who is seen as, read-only and until when, across the top', async () => {
    const { service } = renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    const banner = screen.getByRole('region', { name: 'Support session' })
    expect(banner).toHaveTextContent('You are viewing as Ada Lovelace for support.')
    expect(banner).toHaveTextContent('Read-only')
    const time = new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(new Date(ENDS_AT))
    expect(banner).toHaveTextContent(`Ends at ${time}`)
    expect(within(banner).getByRole('button', { name: 'End session' })).toBeEnabled()
    // The support session's refresh, never the operator's own.
    expect(service.state.calls).toContain('POST /identity/v1/session/impersonation/refresh')
    expect(service.state.calls).not.toContain('POST /identity/v1/session/refresh')
  })

  it('opens the support session’s own live stream', async () => {
    renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    expect(open()[0]!.url).toBe(`${ORIGIN}/identity/v1/session/events?impersonation=true`)
  })

  it('disables every submit button and refuses a submission that gets through', async () => {
    renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    const save = screen.getByRole('button', { name: 'Save' })
    await waitFor(() => expect(save).toBeDisabled())
    // A control that writes asks useReadOnly.
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()

    fireEvent.submit(save.closest('form')!)
    expect(submitted).not.toHaveBeenCalled()
    expect(
      await screen.findByText('A support session can look but not change anything.'),
    ).toBeInTheDocument()
  })

  it('says a refused write was refused because it is a support session', async () => {
    renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Rename anyway' }))
    expect(
      await screen.findByText('A support session can look but not change anything.'),
    ).toBeInTheDocument()
  })

  it('hides tokens and keys, from the menu and at their address', async () => {
    renderSupport('/api-keys')
    expect(
      await screen.findByText('Not available in a support session', undefined, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'keys page' })).not.toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Navigation' })[0]!
    expect(within(nav).queryByText('API keys')).not.toBeInTheDocument()
    expect(within(nav).getByText('Settings')).toBeInTheDocument()
  })

  it('keeps the token in memory only', async () => {
    renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    const kept = (storage: Storage) =>
      Array.from({ length: storage.length }, (_, i) => {
        const key = storage.key(i)!
        return `${key}=${storage.getItem(key)}`
      }).join('\n')
    expect(kept(window.localStorage)).not.toContain(ACCESS)
    expect(kept(window.sessionStorage)).not.toContain(ACCESS)
    // Nothing of the person's is cached on the operator's device either.
    expect(window.localStorage.getItem(storageKey('preferences'))).toBeNull()
    expect(document.cookie).not.toContain(ACCESS)
  })

  it('says it ended when an Owner withdraws consent, and stops', async () => {
    renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    const stream = open()[0]!
    stream.send('ready', { session_id: 's-1' })
    stream.send('session.revoked', {
      session_id: 's-1',
      scope: 'session',
      code: 'consent_revoked',
      message: 'Consent withdrawn.',
    })
    expect(
      await screen.findByRole('heading', { name: 'Support session ended' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('An Owner of the organization withdrew their consent.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'settings page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'sign-in page' })).not.toBeInTheDocument()
    expect(stream.closed).toBe(true)
  })

  it('says it ended when the refresh says so, in the server’s words', async () => {
    const { service, auth } = renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    service.state.over = { code: 'impersonation.ended', message: 'The time box has passed.' }
    // The token in hand ran out with the time box; the next request refreshes.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await act(() => vi.advanceTimersByTimeAsync(16 * 60 * 1000))
      await act(async () => {
        await auth.getToken()
      })
    } finally {
      vi.useRealTimers()
    }
    expect(
      await screen.findByRole('heading', { name: 'Support session ended' }),
    ).toBeInTheDocument()
    expect(screen.getByText('The time box has passed.')).toBeInTheDocument()
  })

  it('ends with End session, never touching the operator’s own session', async () => {
    const { service } = renderSupport()
    await screen.findByRole('heading', { name: 'settings page' }, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    expect(
      await screen.findByRole('heading', { name: 'Support session ended' }),
    ).toBeInTheDocument()
    expect(service.state.calls).toContain('POST /identity/v1/session/impersonation/end')
    expect(service.state.calls).not.toContain('POST /identity/v1/session/sign-out')
  })

  it('says it is over when it was over before the tab loaded', async () => {
    const service = supportService()
    service.state.over = { code: 'impersonation.ended', message: 'No support session here.' }
    const auth = createAuth({
      app: 'admin',
      apiOrigin: ORIGIN,
      fetch: service.fetch,
      support: true,
    })
    expect(await auth.sessionSource.load()).toBeNull()
    expect(auth.reason()).toBe('support_ended')
    expect(auth.support?.ended()).toEqual({
      code: 'impersonation.ended',
      message: 'No support session here.',
    })
  })
})
