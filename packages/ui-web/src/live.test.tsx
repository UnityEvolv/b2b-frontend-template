// @vitest-environment jsdom
import type { EventSourceLike } from '@b2b-template/client'
import { createI18n } from '@b2b-template/i18n'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppDefinition } from './app'
import type { SignedOutReason } from './auth'
import { createAuth } from './auth'
import { useLiveEvent } from './live'
import { buildRoutes } from './routing'
import type { Session, SessionSource } from './session'
import { AppProviders } from './start'
import { signedIn } from '../test/render-app'

// A product's own event type, registered the way a product does it.
declare module '@b2b-template/client' {
  interface LiveEventTypes {
    'example.noted': { note_id: string }
  }
}

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

const EVENTS_URL = 'https://api.example.test/identity/v1/session/events'

/** A page that shows the product's own events as they arrive. */
function NotesPage() {
  const [notes, setNotes] = useState<string[]>([])
  useLiveEvent('example.noted', (event) => {
    const id = event.data?.note_id
    if (id) setNotes((n) => [...n, id])
  })
  return (
    <>
      <h1>home page</h1>
      <p>notes: {notes.join(',')}</p>
    </>
  )
}

function renderLive() {
  let alive = true
  let reason: SignedOutReason | null = null
  let org = 'o-1'
  const session = (): Session => ({
    ...signedIn(),
    membership: { orgId: org, membershipId: `m-${org}`, role: 'user' },
  })
  const source = {
    load: vi.fn(async () => {
      reason = null
      return alive ? session() : null
    }),
    savePreferences: async () => {},
    signOut: async () => {
      alive = false
    },
    forget: vi.fn(async () => {
      alive = false
      reason = 'signed_out'
    }),
  } satisfies SessionSource
  const auth = {
    eventsUrl: EVENTS_URL,
    reason: () => reason,
    orgs: { list: async () => [], switchTo: async () => {} },
  } as unknown as AppDefinition['auth']
  const definition: AppDefinition = {
    app: 'account',
    navNamespace: 'account',
    home: '/home',
    signInPath: '/sign-in',
    routes: [
      { path: '/home', page: async () => ({ default: NotesPage }) },
      {
        path: '/sign-in',
        access: 'public',
        page: () => import('./sign-in').then((m) => ({ default: m.SignInPage })),
      },
    ],
    sessionSource: source,
    auth,
  }
  const router = createMemoryRouter(buildRoutes(definition), { initialEntries: ['/home'] })
  render(
    <AppProviders definition={definition} i18n={createI18n()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { router, source, moveTo: (next: string) => (org = next) }
}

beforeEach(() => {
  FakeEventSource.opened = []
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('live session events in the shell', { timeout: 20_000 }, () => {
  it('opens the stream on the identity service with the session cookie', async () => {
    renderLive()
    await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    expect(open()[0]!.url).toBe(EVENTS_URL)
    expect(open()[0]!.init).toEqual({ withCredentials: true })
    // The address comes from the same place as every other identity call.
    const auth = createAuth({ app: 'account', apiOrigin: 'https://api.example.test/' })
    expect(auth.eventsUrl).toBe(EVENTS_URL)
  })

  it('signs out on a revocation, forgets the session, and says so neutrally on sign-in', async () => {
    const { router, source } = renderLive()
    await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    const stream = open()[0]!
    stream.send('ready', { session_id: 's-1' })
    stream.send('session.revoked', { session_id: 's-1', scope: 'session', code: 'revoked' })

    expect(
      await screen.findByText('You were signed out. Sign in again to continue.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(source.forget).toHaveBeenCalledTimes(1)
    expect(stream.closed).toBe(true)
    expect(open()).toHaveLength(0)
  })

  it("ignores another session's revocation", async () => {
    const { router, source } = renderLive()
    await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    const stream = open()[0]!
    stream.send('ready', { session_id: 's-1' })
    stream.send('session.revoked', { session_id: 's-2', scope: 'session' })
    expect(source.forget).not.toHaveBeenCalled()
    expect(stream.closed).toBe(false)
    expect(router.state.location.pathname).toBe('/home')
  })

  it('loads the session again on a membership change, and reopens in the new org', async () => {
    const { source, moveTo } = renderLive()
    await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    const first = open()[0]!
    first.send('ready', { session_id: 's-1' })
    expect(source.load).toHaveBeenCalledTimes(1)

    // The session was moved to another org: the stream is the old org's.
    moveTo('o-2')
    first.send('membership.changed', { session_id: 's-1', org_id: 'o-1' })
    await waitFor(() => expect(source.load).toHaveBeenCalledTimes(2))
    await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    expect(first.closed).toBe(true)
    expect(open()[0]).not.toBe(first)
  })

  it('loads the session again when the org is suspended', async () => {
    const { source } = renderLive()
    await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    open()[0]!.send('org.suspended', { org_id: 'o-1' })
    await waitFor(() => expect(source.load).toHaveBeenCalledTimes(2))
  })

  it("hands a product's own events to the page that listens", async () => {
    renderLive()
    await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
    await waitFor(() => expect(open()).toHaveLength(1))
    open()[0]!.send('example.noted', { data: { note_id: 'n-1' } })
    open()[0]!.send('example.noted', { data: { note_id: 'n-2' } })
    expect(await screen.findByText('notes: n-1,n-2')).toBeInTheDocument()
  })

  it('reopens a stream that failed, after a wait', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      renderLive()
      await screen.findByRole('heading', { name: 'home page' }, { timeout: 5000 })
      await waitFor(() => expect(open()).toHaveLength(1))
      const first = open()[0]!
      first.send('error')
      expect(first.closed).toBe(true)
      expect(open()).toHaveLength(0)
      await act(() => vi.advanceTimersByTimeAsync(1_000))
      expect(open()).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
