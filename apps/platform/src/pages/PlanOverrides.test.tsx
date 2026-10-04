// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Toaster } from '@unityevolv/unitykit'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import { PlanOverrides } from './PlanOverrides'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const catalogue = {
  bands: [],
  limits: [
    { key: 'users', label: 'users' },
    { key: 'projects', label: 'projects' },
  ],
  features: [{ key: 'api_access', label: 'API access' }],
}

const OVERRIDES = [
  { kind: 'limit', key: 'users', cap: 75, ends_at: '2027-01-31T23:59:59Z', in_force: true },
  {
    kind: 'feature',
    key: 'api_access',
    allowed: true,
    ends_at: '2026-09-01T00:00:00Z',
    in_force: false,
  },
]

interface Call {
  method: string
  path: string
  body?: unknown
}

function renderOverrides(answer?: (call: Call) => Response | undefined) {
  const calls: Call[] = []
  const fetch = async (input: Request) => {
    const url = new URL(input.url)
    const text = input.method === 'PUT' ? await input.text() : ''
    const call = {
      method: input.method,
      path: url.pathname,
      ...(text ? { body: JSON.parse(text) as unknown } : {}),
    }
    calls.push(call)
    const custom = answer?.(call)
    if (custom) return custom
    if (input.method === 'GET') return json({ overrides: OVERRIDES })
    if (input.method === 'PUT') return json({ ...(call.body as object), in_force: true })
    if (input.method === 'DELETE') return new Response(null, { status: 204 })
    return new Response(null, { status: 404 })
  }
  const api = createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch })
  render(
    <I18nextProvider i18n={createI18n()}>
      <PlanOverrides api={api} orgId="org-1" catalogue={catalogue} />
      <Toaster />
    </I18nextProvider>,
  )
  return calls
}

const BASE = '/organization/v1/organizations/org-1/plan-overrides'

describe('an organization’s overrides, for a platform operator', () => {
  it('lists each override in force or ended, by the catalogue’s labels', async () => {
    renderOverrides()
    const users = (await screen.findByText('Users')).closest('tr')!
    expect(within(users).getByText('Cap of 75')).toBeTruthy()
    expect(within(users).getByText('In force')).toBeTruthy()
    const api = screen.getByText('API access').closest('tr')!
    expect(within(api).getByText('Granted')).toBeTruthy()
    expect(within(api).getByText('Ended')).toBeTruthy()
  })

  it('offers only registered limits and features, never a typed key', async () => {
    renderOverrides()
    fireEvent.click(await screen.findByRole('button', { name: 'Add an override' }))
    const picker = await screen.findByRole('combobox', { name: 'Limit or feature' })
    expect(
      within(picker)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value),
    ).toEqual(['', 'limit:users', 'limit:projects', 'feature:api_access'])
    expect(screen.queryByRole('textbox', { name: /key/i })).toBeNull()
  })

  it('refuses to send a form that is wrong, and says which field', async () => {
    const calls = renderOverrides()
    fireEvent.click(await screen.findByRole('button', { name: 'Add an override' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save override' }))
    expect(await screen.findByText('Choose a limit or feature.')).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Limit or feature' }), {
      target: { value: 'limit:projects' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cap' }), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }))
    expect(
      await screen.findByText('Enter a whole number of 1 or more, or choose no cap.'),
    ).toBeTruthy()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cap' }), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText(/Last day/), { target: { value: '2020-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }))
    expect(await screen.findByText('Choose a day from today on, or leave it empty.')).toBeTruthy()
    expect(calls.filter((c) => c.method === 'PUT')).toEqual([])
  })

  it('lifts a limit’s cap with no cap, which is 0', async () => {
    const calls = renderOverrides()
    fireEvent.click(await screen.findByRole('button', { name: 'Add an override' }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Limit or feature' }), {
      target: { value: 'limit:projects' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'No cap' }))
    expect(screen.queryByRole('spinbutton', { name: 'Cap' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        path: `${BASE}/limit/projects`,
        body: { cap: 0 },
      }),
    )
  })

  it('takes a feature away until a day, editing the one there', async () => {
    const calls = renderOverrides()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit the override of API access' }))
    const picker = await screen.findByRole('combobox', { name: 'Limit or feature' })
    expect((picker as HTMLSelectElement).value).toBe('feature:api_access')
    expect((picker as HTMLSelectElement).disabled).toBe(true)
    fireEvent.change(screen.getByRole('combobox', { name: 'Feature' }), {
      target: { value: 'false' },
    })
    fireEvent.change(screen.getByLabelText(/Last day/), { target: { value: '2099-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        path: `${BASE}/feature/api_access`,
        body: { allowed: false, ends_at: new Date('2099-12-31T23:59:59').toISOString() },
      }),
    )
  })

  it('shows the service’s refusal in its words', async () => {
    renderOverrides((call) =>
      call.method === 'PUT'
        ? json({ code: 'validation', message: 'ends_at must be in the future' }, 400)
        : undefined,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Add an override' }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Limit or feature' }), {
      target: { value: 'feature:api_access' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }))
    expect(await screen.findByText('ends_at must be in the future')).toBeTruthy()
  })

  it('removes one after asking', async () => {
    const calls = renderOverrides()
    fireEvent.click(await screen.findByRole('button', { name: 'Remove the override of Users' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'DELETE', path: `${BASE}/limit/users` }),
    )
  })
})
