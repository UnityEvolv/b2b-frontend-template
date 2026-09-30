// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import type { EventSourceLike } from '@b2b-template/client'
import { createI18n } from '@b2b-template/i18n'
import {
  AppProviders,
  buildRoutes,
  memorySessionSource,
  type AppDefinition,
  type Session,
} from '@b2b-template/ui-web'
import { act, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Project } from './api'
import { projectsApp } from './definition'

// Pages load lazily, as in the app; with every test file running at once that can take a while.
configure({ asyncUtilTimeout: 5000 })

/*
 * The example app as startApp assembles it, on a memory router, against an
 * API that answers from each test's handlers. Every seam is exercised through
 * the template's own shell: routes, nav, permission gate, live events, i18n.
 */

const ORG = '0190a000-0000-7000-8000-000000000001'
const ME = '0190a000-0000-7000-8000-00000000000a'
const BILLING = 'https://admin.test/billing'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id,
  org_id: ORG,
  name: `Project ${id}`,
  description: '',
  member_count: 0,
  created_by: `membership:${ME}`,
  created_at: '2026-10-01T09:00:00Z',
  last_modified_by: `membership:${ME}`,
  last_modified_at: '2026-10-01T09:00:00Z',
  ...extra,
})

const membership = (id: string, name: string) => ({
  id,
  org_id: ORG,
  user: { id: `u-${id}`, email: `${id}@example.org`, name, created_at: '2026-01-01T00:00:00Z' },
  kind: 'member',
  role: 'user',
  status: 'active',
  source: 'invite',
  directory: {},
  created_at: '2026-01-01T00:00:00Z',
  last_modified_at: '2026-01-01T00:00:00Z',
})

/** A request the fake API saw: the method, the path and query, the headers and the body. */
interface Seen {
  method: string
  url: URL
  headers: Headers
  body: unknown
}

/** A handler answers one request, or returns undefined to pass it on. */
type Handler = (request: Seen) => Response | undefined | Promise<Response | undefined>

type Listener = (event: { data?: unknown }) => void

/** The browser's EventSource, in memory: a test says what the server sends. */
class FakeEventSource implements EventSourceLike {
  static opened: FakeEventSource[] = []
  listeners = new Map<string, Listener[]>()
  closed = false
  constructor(public url: string) {
    FakeEventSource.opened.push(this)
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  close() {
    this.closed = true
  }
  send(type: string, body: Record<string, unknown>) {
    const data = JSON.stringify({ type, at: '2026-10-01T00:00:00Z', ...body })
    act(() => {
      for (const listener of this.listeners.get(type) ?? []) listener({ data })
    })
  }
}

function renderProjects({
  path = '/projects',
  permissions = ['projects'],
  handlers = [],
}: {
  path?: string
  permissions?: string[]
  handlers?: Handler[]
} = {}) {
  const seen: Seen[] = []
  const fetch = (async (input: Request | string, init?: RequestInit) => {
    const request =
      typeof input === 'string'
        ? {
            method: init?.method ?? 'GET',
            url: new URL(input),
            headers: new Headers(init?.headers),
            body: init?.body,
          }
        : {
            method: input.method,
            url: new URL(input.url),
            headers: input.headers,
            body: input.body ? await input.clone().json() : undefined,
          }
    seen.push(request)
    for (const handler of handlers) {
      const response = await handler(request)
      if (response) return response
    }
    return json({ code: 'not_found', message: 'Not found.' }, 404)
  }) as typeof globalThis.fetch

  const session: Session = {
    user: {
      id: 'u-me',
      email: 'asha@example.org',
      displayName: 'Asha Rao',
      preferences: { theme: 'system', language: null },
    },
    permissions,
    membership: { orgId: ORG, membershipId: ME, role: 'admin' },
  }
  const auth = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    getToken: async () => 't',
    eventsUrl: 'https://api.test/identity/v1/session/events',
    reason: () => null,
    orgs: { list: async () => [], switchTo: async () => {} },
  } as unknown as AppDefinition['auth']
  const definition = projectsApp({
    sessionSource: memorySessionSource(session),
    auth,
    projectsUrl: 'https://api.test/projects',
    billingUrl: BILLING,
    fetch,
  })
  const router = createMemoryRouter(buildRoutes(definition), { initialEntries: [path] })
  const view = render(
    <AppProviders definition={definition} i18n={createI18n('en', definition.locales)}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...view, router, seen, definition }
}

const BASE = `/projects/v1/organizations/${ORG}/projects`
const P1 = '0190a000-0000-7000-8000-0000000000f1'

const is = (method: string, path: string) => (r: Seen) =>
  r.method === method && r.url.pathname === path

/** The org's active members, from the template's user service. */
const people: Handler = (r) =>
  r.url.pathname === `/user/v1/organizations/${ORG}/memberships`
    ? json({
        memberships: [membership('m-bea', 'Bea Kim'), membership('m-chen', 'Chen Li')],
      })
    : undefined

/** One project, shared with Bea, and its members. */
function detail(extra: Parameters<typeof project>[1] = {}): Handler {
  return (r) => {
    if (is('GET', `${BASE}/${P1}`)(r)) return json(project(P1, { name: 'Apollo', ...extra }))
    if (is('GET', `${BASE}/${P1}/members`)(r)) {
      return json({
        members: [
          {
            project_id: P1,
            membership_id: 'm-bea',
            added_by: 'membership:x',
            added_at: '2026-10-01T09:00:00Z',
          },
        ],
      })
    }
    return undefined
  }
}

beforeEach(() => {
  FakeEventSource.opened = []
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource
})

afterEach(() => {
  delete (globalThis as { EventSource?: unknown }).EventSource
})

describe('the app definition', () => {
  it('puts its page in the nav, with its own words', async () => {
    renderProjects({ handlers: [(r) => (r.method === 'GET' ? json({ projects: [] }) : undefined)] })
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Projects' }).length).toBeGreaterThan(0)
    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
  })

  it('keeps the create page behind the permission group', async () => {
    renderProjects({ path: '/projects/new', permissions: [] })
    expect(
      await screen.findByRole('heading', { name: 'You do not have access to this page' }),
    ).toBeInTheDocument()
  })
})

describe('the list', () => {
  it('pages by the service’s cursor with "Load more"', async () => {
    const user = userEvent.setup()
    const { seen } = renderProjects({
      handlers: [
        (r) => {
          if (!is('GET', BASE)(r)) return undefined
          return r.url.searchParams.get('cursor') === 'c-2'
            ? json({ projects: [project('p-3', { name: 'Gemini' })] })
            : json({
                projects: [project('p-1', { name: 'Apollo', member_count: 2 }), project('p-2')],
                next_cursor: 'c-2',
              })
        },
      ],
    })
    expect(await screen.findByRole('link', { name: 'Apollo' })).toBeInTheDocument()
    expect(screen.getByText('2 members')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gemini' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(await screen.findByRole('link', { name: 'Gemini' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apollo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    const pages = seen.filter(is('GET', BASE))
    expect(pages.map((r) => r.url.searchParams.get('cursor'))).toEqual([null, 'c-2'])
    expect(pages[0]?.url.searchParams.get('limit')).toBe('20')
  })

  it('reads again when a project is shared with this person', async () => {
    let shared = false
    renderProjects({
      handlers: [
        (r) =>
          is('GET', BASE)(r)
            ? json({ projects: shared ? [project('p-9', { name: 'Shared one' })] : [] })
            : undefined,
      ],
    })
    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
    await waitFor(() => expect(FakeEventSource.opened.length).toBe(1))
    shared = true
    FakeEventSource.opened[0]!.send('project.shared', { data: { project_id: 'p-9' } })
    expect(await screen.findByRole('link', { name: 'Shared one' })).toBeInTheDocument()
  })

  it('offers no way to create one without the permission group', async () => {
    renderProjects({
      permissions: [],
      handlers: [(r) => (is('GET', BASE)(r) ? json({ projects: [project('p-1')] }) : undefined)],
    })
    expect(await screen.findByRole('link', { name: 'Project p-1' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New project' })).not.toBeInTheDocument()
    expect(screen.getByText(/Changing them needs the Projects permission/)).toBeInTheDocument()
  })
})

describe('creating a project', () => {
  it('sends a key per create, and the same key when the same submit is retried', async () => {
    const user = userEvent.setup()
    let answers = 0
    const { seen } = renderProjects({
      path: '/projects/new',
      handlers: [
        (r) => {
          if (!is('POST', BASE)(r)) return undefined
          answers++
          return answers === 1
            ? json({ code: 'unavailable', message: 'Try later.' }, 503)
            : json(project(P1, { name: 'Apollo' }), 201)
        },
        detail(),
        people,
      ],
    })
    await user.type(await screen.findByLabelText(/^Name/), 'Apollo')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(await screen.findByText(/it will not be created twice/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(await screen.findByRole('heading', { name: 'Apollo' })).toBeInTheDocument()

    const creates = seen.filter(is('POST', BASE))
    expect(creates).toHaveLength(2)
    const [first, second] = creates.map((r) => r.headers.get('Idempotency-Key'))
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(second).toBe(first)
    expect(creates[0]?.body).toEqual({ name: 'Apollo' })
  })

  it('uses a new key once the details change', async () => {
    const user = userEvent.setup()
    const { seen } = renderProjects({
      path: '/projects/new',
      handlers: [(r) => (is('POST', BASE)(r) ? json({}, 503) : undefined)],
    })
    const name = await screen.findByLabelText(/^Name/)
    await user.type(name, 'Apollo')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    await screen.findByText(/it will not be created twice/)
    await user.type(name, ' 2')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    await waitFor(() => expect(seen.filter(is('POST', BASE))).toHaveLength(2))
    const keys = seen.filter(is('POST', BASE)).map((r) => r.headers.get('Idempotency-Key'))
    expect(keys[0]).not.toBe(keys[1])
  })

  it('at the plan’s cap, says which plan allows more and links to billing', async () => {
    const user = userEvent.setup()
    renderProjects({
      path: '/projects/new',
      handlers: [
        (r) =>
          is('POST', BASE)(r)
            ? json(
                {
                  code: 'plan.limit_reached',
                  message: 'The free plan allows 3 projects.',
                  fields: { plan: 'free', limit: 'projects', required_plan: 'team' },
                },
                403,
              )
            : undefined,
      ],
    })
    await user.type(await screen.findByLabelText(/^Name/), 'Fourth')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(
      await screen.findByText(
        /Your free plan allows no more projects\. The team plan allows more\./,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See plans and billing' })).toHaveAttribute(
      'href',
      BILLING,
    )
  })
})

describe('a project', () => {
  it('is edited, and a 403 from the API is shown even when the UI offered the change', async () => {
    const user = userEvent.setup()
    const { seen } = renderProjects({
      path: `/projects/${P1}`,
      handlers: [
        (r) =>
          is('PATCH', `${BASE}/${P1}`)(r)
            ? json({ code: 'forbidden', message: 'No.' }, 403)
            : undefined,
        detail(),
        people,
      ],
    })
    const name = await screen.findByLabelText(/^Name/)
    await user.clear(name)
    await user.type(name, 'Apollo 2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(
      await screen.findByText(/You do not have permission to change projects/),
    ).toBeInTheDocument()
    expect(seen.find(is('PATCH', `${BASE}/${P1}`))?.body).toEqual({
      name: 'Apollo 2',
      description: '',
    })
  })

  it('is deleted after a confirmation, and the list is shown', async () => {
    const user = userEvent.setup()
    const { seen, router } = renderProjects({
      path: `/projects/${P1}`,
      handlers: [
        (r) => (is('DELETE', `${BASE}/${P1}`)(r) ? new Response(null, { status: 204 }) : undefined),
        (r) => (is('GET', BASE)(r) ? json({ projects: [] }) : undefined),
        detail(),
        people,
      ],
    })
    await user.click(await screen.findByRole('button', { name: 'Delete project' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete project' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/projects'))
    expect(seen.some(is('DELETE', `${BASE}/${P1}`))).toBe(true)
  })

  it('is shared with an org member, and stops being shared', async () => {
    const user = userEvent.setup()
    const { seen } = renderProjects({
      path: `/projects/${P1}`,
      handlers: [
        (r) =>
          r.method === 'PUT' && r.url.pathname.startsWith(`${BASE}/${P1}/members/`)
            ? json({
                project_id: P1,
                membership_id: 'm-chen',
                added_by: 'x',
                added_at: '2026-10-01T09:00:00Z',
              })
            : undefined,
        (r) =>
          r.method === 'DELETE' && r.url.pathname.startsWith(`${BASE}/${P1}/members/`)
            ? new Response(null, { status: 204 })
            : undefined,
        detail(),
        people,
      ],
    })
    const members = await screen.findByRole('list', { name: 'Shared with' })
    expect(await within(members).findByText('Bea Kim')).toBeInTheDocument()

    // Only people it is not shared with yet are offered.
    const select = screen.getByLabelText('Person')
    expect(within(select).queryByRole('option', { name: 'Bea Kim' })).not.toBeInTheDocument()
    await user.selectOptions(select, 'm-chen')
    await user.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(seen.some(is('PUT', `${BASE}/${P1}/members/m-chen`))).toBe(true))

    await user.click(screen.getByRole('button', { name: 'Stop sharing with Bea Kim' }))
    await waitFor(() => expect(seen.some(is('DELETE', `${BASE}/${P1}/members/m-bea`))).toBe(true))
    // Read fresh after each change.
    expect(seen.filter(is('GET', `${BASE}/${P1}/members`)).length).toBeGreaterThanOrEqual(3)
  })

  it('takes a cover: a signed URL for the exact type and size, a PUT there, then the new link', async () => {
    const user = userEvent.setup()
    let covered = false
    const { seen } = renderProjects({
      path: `/projects/${P1}`,
      handlers: [
        (r) => {
          if (!is('POST', `${BASE}/${P1}/cover`)(r)) return undefined
          covered = true
          return json({
            upload_url: 'https://bucket.test/org/covers/c-1?sig=1',
            expires_at: '2026-10-01T09:10:00Z',
            project: project(P1),
          })
        },
        (r) =>
          r.url.host === 'bucket.test' && r.method === 'PUT'
            ? new Response(null, { status: 200 })
            : undefined,
        (r) =>
          covered && is('GET', `${BASE}/${P1}`)(r)
            ? json(
                project(P1, {
                  name: 'Apollo',
                  cover_url: 'https://bucket.test/org/covers/c-1?r=1',
                }),
              )
            : undefined,
        detail(),
        people,
      ],
    })
    expect(await screen.findByText('No cover image.')).toBeInTheDocument()
    const file = new File(['x'.repeat(1234)], 'cover.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/Upload a cover/), file)

    expect(await screen.findByRole('img', { name: 'The cover image of Apollo' })).toHaveAttribute(
      'src',
      'https://bucket.test/org/covers/c-1?r=1',
    )
    expect(seen.find(is('POST', `${BASE}/${P1}/cover`))?.body).toEqual({
      content_type: 'image/png',
      size: 1234,
    })
    const put = seen.find((r) => r.url.host === 'bucket.test')
    expect(put?.method).toBe('PUT')
    expect(put?.url.search).toBe('?sig=1')
    expect(put?.headers.get('Content-Type')).toBe('image/png')
    expect(put?.body).toBe(file)
  })

  it('without the permission group is read-only, with nothing offered that changes it', async () => {
    renderProjects({ path: `/projects/${P1}`, permissions: [], handlers: [detail(), people] })
    expect(await screen.findByRole('heading', { name: 'Apollo' })).toBeInTheDocument()
    expect(await screen.findByText('Bea Kim')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('readonly')
    for (const name of ['Save changes', 'Delete project', 'Share', 'Stop sharing with Bea Kim']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByLabelText(/Upload a cover/)).not.toBeInTheDocument()
  })

  it('reads again when it is shared, and has no axe violations', async () => {
    const { seen, container } = renderProjects({
      path: `/projects/${P1}`,
      handlers: [detail(), people],
    })
    expect(await screen.findByText('Bea Kim')).toBeInTheDocument()
    await waitFor(() => expect(FakeEventSource.opened.length).toBe(1))
    const before = seen.filter(is('GET', `${BASE}/${P1}`)).length
    FakeEventSource.opened[0]!.send('project.shared', { data: { project_id: P1 } })
    await waitFor(() =>
      expect(seen.filter(is('GET', `${BASE}/${P1}`)).length).toBeGreaterThan(before),
    )
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results.violations.map((v) => v.id)).toEqual([])
  })
})
