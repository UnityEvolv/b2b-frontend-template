// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { Toaster } from '@unityevolv/unitykit'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import WebhooksPage from './WebhooksPage'
import type { Delivery, DeliveryDetail, Endpoint, EventTypeList } from './webhooks'

const state = vi.hoisted(() => ({ org: null as unknown, granted: [] as string[] }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: (p: string) => state.granted.includes(p) } }),
}))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const TYPES: EventTypeList = {
  available: true,
  event_types: [
    { type: 'member.added', description: 'A member was added.' },
    { type: 'member.removed', description: 'A member was removed.' },
    { type: 'project.created', description: 'A project was created.' },
  ],
}

const endpoint = (over: Partial<Endpoint> = {}): Endpoint => ({
  id: 'e-1',
  org_id: 'org-1',
  url: 'https://hooks.example.test/b2b',
  description: 'CRM sync',
  event_types: ['member.added'],
  enabled: true,
  created_at: '2026-09-01T09:00:00Z',
  last_modified_at: '2026-09-01T09:00:00Z',
  ...over,
})

const delivery = (id: string, over: Partial<Delivery> = {}): Delivery => ({
  id,
  endpoint_id: 'e-1',
  message_id: `msg-${id}`,
  event_type: 'member.added',
  status: 'failed',
  attempts: 6,
  last_status_code: 503,
  last_latency_ms: 412,
  last_error: 'The endpoint answered 503.',
  created_at: '2026-10-04T09:00:00Z',
  ...over,
})

const detail = (d: Delivery, over: Partial<DeliveryDetail> = {}): DeliveryDetail => ({
  ...d,
  payload: { id: d.message_id, type: d.event_type, data: { membership_id: 'm-9' } },
  attempt_log: [
    {
      id: 'a-1',
      attempted_at: '2026-10-04T09:00:00Z',
      manual: false,
      status_code: 503,
      latency_ms: 412,
      error: 'The endpoint answered 503.',
    },
    {
      id: 'a-2',
      attempted_at: '2026-10-04T10:00:00Z',
      manual: true,
      latency_ms: 10000,
      error: 'The endpoint did not answer in time.',
    },
  ],
  ...over,
})

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
const NEW_SECRET = 'whsec_C2FVsBQIhrscChlQIMV+b5sSYspob7oD'

interface Call {
  method: string
  path: string
  query: Record<string, string>
  body?: unknown
}

type Handler = (call: Call) => Response | undefined

/** The page, against a webhooks service holding `endpoints`, as a member holding `granted`. */
function renderPage({
  granted = ['webhooks', 'billing'],
  types = TYPES,
  endpoints = [endpoint()],
  pages = [{ deliveries: [delivery('d-1')] }],
  handle,
}: {
  granted?: string[]
  types?: EventTypeList
  endpoints?: Endpoint[]
  pages?: { deliveries: Delivery[]; next_cursor?: string }[]
  handle?: Handler
} = {}) {
  const calls: Call[] = []
  const fetch = async (input: Request) => {
    const url = new URL(input.url)
    const text = input.method === 'GET' || input.method === 'DELETE' ? '' : await input.text()
    const call: Call = {
      method: input.method,
      path: url.pathname.replace('/webhooks/v1/organizations/org-1', ''),
      query: Object.fromEntries(url.searchParams),
      ...(text ? { body: JSON.parse(text) } : {}),
    }
    calls.push(call)
    const answer = handle?.(call)
    if (answer) return answer
    const { method, path } = call
    if (path === '/webhook-event-types') return json(types)
    if (path === '/webhook-endpoints' && method === 'GET') return json({ endpoints })
    if (path === '/webhook-endpoints' && method === 'POST') {
      return json({ endpoint: endpoint({ id: 'e-new' }), secret: SECRET }, 201)
    }
    if (path.endsWith('/rotate-secret')) return json({ endpoint: endpoint(), secret: NEW_SECRET })
    if (path.endsWith('/test')) {
      return json(
        detail(
          delivery('d-test', {
            event_type: 'webhook.test',
            status: 'succeeded',
            attempts: 1,
            last_status_code: 200,
            last_latency_ms: 87,
          }),
          { attempt_log: [] },
        ),
      )
    }
    if (path.startsWith('/webhook-endpoints/') && method === 'PATCH') {
      return json(endpoint(call.body as Partial<Endpoint>))
    }
    if (path.startsWith('/webhook-endpoints/') && method === 'DELETE') {
      return new Response(null, { status: 204 })
    }
    if (path === '/webhook-deliveries') {
      const page = call.query.cursor ? Number(call.query.cursor.slice(1)) : 0
      return json(pages[page] ?? { deliveries: [] })
    }
    const one = /^\/webhook-deliveries\/([^/]+)(\/resend)?$/.exec(path)
    if (one) {
      const found = pages.flatMap((p) => p.deliveries).find((d) => d.id === one[1])
      if (!found) return json({ code: 'webhooks.not_found', message: 'No such delivery.' }, 404)
      return json(
        one[2]
          ? detail(found, {
              status: 'succeeded',
              attempts: found.attempts + 1,
              last_status_code: 204,
              last_latency_ms: 95,
            })
          : detail(found),
      )
    }
    return new Response(null, { status: 404 })
  }
  state.granted = granted
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role: 'admin',
  }
  const router = createMemoryRouter([{ path: '/webhooks', element: <WebhooksPage /> }], {
    initialEntries: ['/webhooks'],
  })
  render(
    <I18nextProvider i18n={createI18n()}>
      <RouterProvider router={router} />
      <Toaster />
    </I18nextProvider>,
  )
  return calls
}

const URL_ONE = 'https://hooks.example.test/b2b'
const button = (name: string | RegExp) => screen.findByRole('button', { name })

async function openAdd() {
  fireEvent.click(await button('Add an endpoint'))
  return screen.findByRole('dialog')
}

describe('the endpoints', () => {
  it('lists each with its events and state, and the event types to subscribe to', async () => {
    renderPage({
      endpoints: [
        endpoint(),
        endpoint({
          id: 'e-2',
          url: 'https://all.example.test/hook',
          description: '',
          event_types: [],
          enabled: false,
          previous_secret_expires_at: '2026-10-06T09:00:00Z',
        }),
      ],
    })
    const list = await screen.findByRole('table', { name: 'Endpoints' })
    const one = (await within(list).findByText(URL_ONE)).closest('tr')!
    expect(within(one).getByText('CRM sync')).toBeTruthy()
    expect(within(one).getByText('member.added')).toBeTruthy()
    expect(within(one).getByText('On')).toBeTruthy()
    const two = within(list).getByText('https://all.example.test/hook').closest('tr')!
    expect(within(two).getByText('All events')).toBeTruthy()
    expect(within(two).getByText('Off')).toBeTruthy()
    expect(within(two).getByText(/The previous secret also signs until/)).toBeTruthy()

    const dialog = await openAdd()
    const offered = within(dialog)
      .getAllByRole('checkbox')
      .map((c) => c.closest('label')?.textContent?.trim())
    expect(offered).toEqual([
      expect.stringContaining('member.added'),
      expect.stringContaining('member.removed'),
      expect.stringContaining('project.created'),
      expect.stringContaining('On'),
    ])
  })

  it('shows the secret once, and forgets it when the dialog closes', async () => {
    const calls = renderPage()
    const dialog = await openAdd()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: ' https://new.example.test/in ' },
    })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Description' }), {
      target: { value: 'Warehouse' },
    })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /member\.removed/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))

    expect(await screen.findByDisplayValue(SECRET)).toBeTruthy()
    expect(screen.getByText(/This is the only time it is shown/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/webhook-endpoints',
      query: {},
      body: {
        url: 'https://new.example.test/in',
        description: 'Warehouse',
        event_types: ['member.removed'],
        enabled: true,
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'I have copied it' }))
    await waitFor(() => expect(screen.queryByDisplayValue(SECRET)).toBeNull())
    // Nowhere on the page, the list read again included, and not back when another is begun.
    expect(document.body.innerHTML).not.toContain(SECRET)
    await openAdd()
    expect(document.body.innerHTML).not.toContain(SECRET)
  })

  it('sends no event types for every type', async () => {
    const calls = renderPage()
    const dialog = await openAdd()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://new.example.test/in' },
    })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /^On/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    await screen.findByDisplayValue(SECRET)
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      url: 'https://new.example.test/in',
      description: '',
      event_types: [],
      enabled: false,
    })
  })

  it('puts the service’s field errors beside their inputs', async () => {
    renderPage({
      handle: (c) =>
        c.method === 'POST' && c.path === '/webhook-endpoints'
          ? json(
              {
                code: 'invalid_request',
                message: 'Some fields are not valid.',
                fields: {
                  url: 'a public address; this one is private, local or reserved',
                  event_types: 'not a registered event type: member.gone',
                },
              },
              400,
            )
          : undefined,
    })
    const dialog = await openAdd()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    // Nothing typed: said before sending.
    expect(await within(dialog).findByText('Enter the endpoint’s URL.')).toBeTruthy()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://10.0.0.1/in' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    const url = within(dialog).getByRole('textbox', { name: 'URL' })
    await waitFor(() => expect(url.getAttribute('aria-invalid')).toBe('true'))
    expect(
      within(dialog).getByText('a public address; this one is private, local or reserved'),
    ).toBeTruthy()
    expect(within(dialog).getByText('not a registered event type: member.gone')).toBeTruthy()
    expect(screen.queryByDisplayValue(SECRET)).toBeNull()
  })

  it('says when the org has as many endpoints as it may', async () => {
    renderPage({
      handle: (c) =>
        c.method === 'POST' && c.path === '/webhook-endpoints'
          ? json({ code: 'webhooks.endpoint_limit', message: 'At most 20 endpoints.' }, 409)
          : undefined,
    })
    const dialog = await openAdd()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://new.example.test/in' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(
      await within(dialog).findByText(/Your organization has as many endpoints as it may\./),
    ).toBeTruthy()
  })

  it('changes an endpoint, and turns one off', async () => {
    const calls = renderPage()
    fireEvent.click(await button(`Edit ${URL_ONE}`))
    const dialog = await screen.findByRole('dialog')
    expect((within(dialog).getByRole('textbox', { name: 'URL' }) as HTMLInputElement).value).toBe(
      URL_ONE,
    )
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /project\.created/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/webhook-endpoints/e-1',
        query: {},
        body: {
          url: URL_ONE,
          description: 'CRM sync',
          event_types: ['member.added', 'project.created'],
          enabled: true,
        },
      }),
    )
    fireEvent.click(await button(`Turn off ${URL_ONE}`))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/webhook-endpoints/e-1',
        query: {},
        body: { enabled: false },
      }),
    )
  })

  it('deletes one only after asking', async () => {
    const calls = renderPage()
    fireEvent.click(await button(`Delete ${URL_ONE}`))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/stops receiving events at once/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'DELETE', path: '/webhook-endpoints/e-1', query: {} }),
    )
  })

  it('rotates the secret with the overlap asked, and shows the new one once', async () => {
    const calls = renderPage()
    fireEvent.click(await button(`Rotate the secret of ${URL_ONE}`))
    const dialog = await screen.findByRole('dialog')
    const overlap = within(dialog).getByRole('spinbutton', { name: 'Overlap (hours)' })
    expect((overlap as HTMLInputElement).value).toBe('24')
    fireEvent.change(overlap, { target: { value: '200' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate' }))
    expect(
      await within(dialog).findByText('Enter a whole number of hours from 0 to 168.'),
    ).toBeTruthy()
    expect(calls.some((c) => c.path.endsWith('/rotate-secret'))).toBe(false)

    fireEvent.change(overlap, { target: { value: '0' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate' }))
    expect(await screen.findByDisplayValue(NEW_SECRET)).toBeTruthy()
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/webhook-endpoints/e-1/rotate-secret',
      query: {},
      body: { overlap_hours: 0 },
    })
    expect(screen.getByRole('dialog', { name: 'Your endpoint’s new signing secret' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'I have copied it' }))
    await waitFor(() => expect(document.body.innerHTML).not.toContain(NEW_SECRET))
  })

  it('sends a test and says how it went, then reads the deliveries again', async () => {
    const calls = renderPage()
    await button(`Send a test event to ${URL_ONE}`)
    const reads = () => calls.filter((c) => c.path === '/webhook-deliveries').length
    const before = reads()
    fireEvent.click(await button(`Send a test event to ${URL_ONE}`))
    expect(await screen.findByText('Delivered: the endpoint answered 200 in 87 ms.')).toBeTruthy()
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/webhook-endpoints/e-1/test',
      query: {},
    })
    await waitFor(() => expect(reads()).toBeGreaterThan(before))
  })

  it('says why a test was not delivered', async () => {
    renderPage({
      handle: (c) =>
        c.path.endsWith('/test')
          ? json(detail(delivery('d-test', { status: 'pending', attempts: 1 })))
          : undefined,
    })
    fireEvent.click(await button(`Send a test event to ${URL_ONE}`))
    expect(await screen.findByText('Not delivered: HTTP 503')).toBeTruthy()
  })
})

describe('a plan without webhooks', () => {
  it('names the plan that has them, links to billing, and holds back adding, tests and resends', async () => {
    renderPage({ types: { ...TYPES, available: false, required_plan: 'team' } })
    expect(
      await screen.findByText(
        /Your organization’s plan does not include webhooks; the Team plan does\./,
      ),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See the plans' }).getAttribute('href')).toBe(
      '/billing',
    )
    expect(
      (screen.getByRole('button', { name: 'Add an endpoint' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: `Send a test event to ${URL_ONE}` }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    // Tidying up works on any plan.
    expect(
      (screen.getByRole('button', { name: `Turn off ${URL_ONE}` }) as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(
      (screen.getByRole('button', { name: `Delete ${URL_ONE}` }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('asks a member without billing to see whoever manages it', async () => {
    renderPage({ granted: ['webhooks'], types: { ...TYPES, available: false } })
    expect(
      await screen.findByText(/does not include webhooks\. Ask whoever manages billing/),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'See the plans' })).toBeNull()
  })

  it('shows the refusal when adding is refused for the plan', async () => {
    renderPage({
      handle: (c) =>
        c.method === 'POST' && c.path === '/webhook-endpoints'
          ? json(
              {
                code: 'plan.limit_reached',
                message: 'Your plan does not include webhooks.',
                fields: { plan: 'free', limit: 'webhooks', required_plan: 'team' },
              },
              403,
            )
          : undefined,
    })
    const dialog = await openAdd()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://new.example.test/in' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(await screen.findByText(/the Team plan does\./)).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByDisplayValue(SECRET)).toBeNull()
  })
})

describe('the deliveries', () => {
  it('pages with the cursor, and filters by endpoint and status', async () => {
    const calls = renderPage({
      pages: [
        { deliveries: [delivery('d-1'), delivery('d-2')], next_cursor: 'p1' },
        { deliveries: [delivery('d-3', { event_type: 'member.removed' })] },
      ],
    })
    const table = await screen.findByRole('table', { name: 'Deliveries' })
    await waitFor(() => expect(within(table).getAllByText('member.added')).toHaveLength(2))
    expect(within(table).getAllByText('HTTP 503')).toHaveLength(2)
    fireEvent.click(await button('Load more'))
    expect(await within(table).findByText('member.removed')).toBeTruthy()
    expect(within(table).getAllByText('member.added')).toHaveLength(2)
    expect(calls).toContainEqual({
      method: 'GET',
      path: '/webhook-deliveries',
      query: { limit: '50', cursor: 'p1' },
    })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull())

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'failed' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Endpoint' }), {
      target: { value: 'e-1' },
    })
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'GET',
        path: '/webhook-deliveries',
        query: { limit: '50', status: 'failed', endpoint_id: 'e-1' },
      }),
    )
  })

  it('opens one with its payload and every attempt, and resends it', async () => {
    const calls = renderPage()
    fireEvent.click(await button(/^Details of member\.added/))
    const drawer = await screen.findByRole('dialog', { name: 'Delivery' })
    expect(await within(drawer).findByText(/"membership_id": "m-9"/)).toBeTruthy()
    expect(within(drawer).getByText('msg-d-1')).toBeTruthy()
    const attempts = within(drawer).getByRole('table', { name: 'Attempts' })
    const [first, second] = within(attempts).getAllByRole('row').slice(1)
    expect(within(first!).getByText('Automatic')).toBeTruthy()
    expect(within(first!).getByText('503')).toBeTruthy()
    expect(within(first!).getByText('412 ms')).toBeTruthy()
    expect(within(second!).getByText('An admin')).toBeTruthy()
    expect(within(second!).getByText('No answer')).toBeTruthy()
    expect(within(second!).getByText('The endpoint did not answer in time.')).toBeTruthy()

    const reads = calls.filter((c) => c.path === '/webhook-deliveries').length
    fireEvent.click(within(drawer).getByRole('button', { name: 'Resend' }))
    expect(await screen.findByText('Delivered: the endpoint answered 204 in 95 ms.')).toBeTruthy()
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/webhook-deliveries/d-1/resend',
      query: {},
    })
    expect(await within(drawer).findByText('Delivered')).toBeTruthy()
    await waitFor(() =>
      expect(calls.filter((c) => c.path === '/webhook-deliveries').length).toBeGreaterThan(reads),
    )
  })

  it('holds back a resend on a plan without webhooks', async () => {
    renderPage({ types: { ...TYPES, available: false } })
    fireEvent.click(await button(/^Details of member\.added/))
    const drawer = await screen.findByRole('dialog', { name: 'Delivery' })
    await within(drawer).findByText('msg-d-1')
    expect(
      (within(drawer).getByRole('button', { name: 'Resend' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(within(drawer).getByText('Resending needs a plan that includes webhooks.')).toBeTruthy()
  })
})
