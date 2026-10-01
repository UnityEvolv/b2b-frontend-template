// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import UsersPage from './UsersPage'

const state = vi.hoisted(() => ({ org: null as unknown, granted: [] as string[] }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: (p: string) => state.granted.includes(p) } }),
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const MEMBER = {
  id: 'm-2',
  org_id: 'org-1',
  role: 'user',
  status: 'active',
  kind: 'member',
  user: { id: 'u-2', name: 'Ravi Iyer', email: 'ravi@example.org' },
  directory: {},
  created_at: '2026-09-01T09:00:00Z',
}

/** The list as a member holding `role` and the `granted` permissions. */
async function renderAs(role: string, granted: string[]) {
  const fetch = async (input: Request) =>
    new URL(input.url).pathname.endsWith('/memberships')
      ? json({ memberships: [MEMBER] })
      : new Response(null, { status: 404 })
  state.granted = granted
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role,
  }
  const router = createMemoryRouter([{ path: '/users', element: <UsersPage /> }], {
    initialEntries: ['/users'],
  })
  render(
    <I18nextProvider i18n={createI18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  )
  await screen.findByText('Ravi Iyer', {}, { timeout: 5000 })
}

describe('the people list', () => {
  it('offers a Billing Admin no invite and no import, which the API would refuse', async () => {
    await renderAs('billing_admin', ['billing'])
    expect(screen.queryByRole('link', { name: 'Invite people' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Import from a sheet' })).toBeNull()
  })

  it('offers them nothing even when an Owner grants them the users permission', async () => {
    await renderAs('billing_admin', ['billing', 'users'])
    expect(screen.queryByRole('link', { name: 'Invite people' })).toBeNull()
  })

  it('offers an Admin without the users permission no invite', async () => {
    await renderAs('admin', ['settings', 'audit'])
    expect(screen.queryByRole('link', { name: 'Invite people' })).toBeNull()
  })

  it('offers an Admin with the users permission both', async () => {
    await renderAs('admin', ['settings', 'users'])
    expect(screen.getByRole('link', { name: 'Invite people' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Import from a sheet' })).toBeTruthy()
  })
})
