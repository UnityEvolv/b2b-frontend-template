// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import OrganizationDetailPage from './OrganizationDetailPage'
import OrganizationsPage from './OrganizationsPage'

const app = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useApp: () => app.current,
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

/** A catalogue with a product's band (Scale-up) beside the template's; no band is named in the app. */
const catalogue = {
  bands: [
    { name: 'free', label: 'Free', contractual: false, limits: { users: 5 }, features: [] },
    { name: 'team', label: 'Team', contractual: false, limits: { users: 25 }, features: [] },
    {
      name: 'scale_up',
      label: 'Scale-up (annual)',
      contractual: false,
      limits: { users: 0 },
      features: ['gantt'],
    },
    {
      name: 'enterprise',
      label: 'Enterprise',
      contractual: true,
      limits: { users: 0 },
      features: [],
    },
  ],
  limits: [{ key: 'users', label: 'users' }],
  features: [{ key: 'gantt', label: 'Gantt charts' }],
}

const acme = {
  org_id: 'org-1',
  name: 'Acme',
  plan: 'scale_up',
  status: 'active',
  time_zone: 'UTC',
  created_at: '2026-01-01T00:00:00Z',
  last_modified_at: '2026-01-01T00:00:00Z',
}

function renderAt(path: string, element: ReactNode, route: string) {
  const calls: string[] = []
  const fetch = async (input: Request) => {
    const url = new URL(input.url)
    calls.push(url.pathname + url.search)
    if (url.pathname.endsWith('/v1/plans')) return json(catalogue)
    if (url.pathname.endsWith('/v1/organizations')) return json({ organizations: [acme] })
    if (url.pathname.endsWith('/v1/organizations/org-1')) return json(acme)
    if (url.pathname.endsWith('/plan-change')) {
      return json({
        from: 'scale_up',
        to: url.searchParams.get('plan'),
        downgrade: true,
        consequences: [],
      })
    }
    return new Response(null, { status: 404 })
  }
  app.current = {
    auth: {
      api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    },
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  )
  return calls
}

const optionsOf = (picker: HTMLElement) =>
  within(picker)
    .getAllByRole('option')
    .map((o) => [(o as HTMLOptionElement).value, o.textContent])

describe('the platform’s plan pickers', () => {
  it('filters the list by any band in the catalogue, by its label', async () => {
    const calls = renderAt('/organizations', <OrganizationsPage />, '/organizations')
    const picker = await screen.findByRole('combobox', { name: 'Plan' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(5))
    expect(optionsOf(picker)).toEqual([
      ['', 'Any'],
      ['free', 'Free'],
      ['team', 'Team'],
      ['scale_up', 'Scale-up (annual)'],
      ['enterprise', 'Enterprise'],
    ])
    expect(await screen.findByText('Scale-up (annual)', { selector: 'td, td *' })).toBeTruthy()
    fireEvent.change(picker, { target: { value: 'scale_up' } })
    await waitFor(() => expect(calls.some((c) => c.includes('plan=scale_up'))).toBe(true))
  })

  it('moves an org to a band picked from the catalogue, never typed', async () => {
    const calls = renderAt(
      '/organizations/org-1',
      <OrganizationDetailPage />,
      '/organizations/:orgId',
    )
    const picker = await screen.findByRole('combobox', { name: 'Move to' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(4))
    expect(optionsOf(picker)).toEqual([
      ['', 'Choose a plan'],
      ['free', 'Free'],
      ['team', 'Team'],
      ['enterprise', 'Enterprise (contractual)'],
    ])
    expect(screen.getByText('On Scale-up (annual).')).toBeTruthy()
    fireEvent.change(picker, { target: { value: 'free' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review the move' }))
    expect(await screen.findByRole('button', { name: 'Move to Free' })).toBeTruthy()
    expect(calls).toContain('/organization/v1/organizations/org-1/plan-change?plan=free')
  })
})
