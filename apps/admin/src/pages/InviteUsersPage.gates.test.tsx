// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import InviteUsersPage from './InviteUsersPage'

const state = vi.hoisted(() => ({ org: null as unknown, granted: [] as string[] }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: (p: string) => state.granted.includes(p) } }),
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const invite = (email: string, role: string, invitedBy: string) => ({
  invite_id: `i-${email}`,
  org_id: 'org-1',
  email,
  role,
  status: 'pending',
  expires_at: '2026-10-08T09:00:00Z',
  created_at: '2026-10-01T09:00:00Z',
  invited_by_membership_id: invitedBy,
})

/** One pending invite for each role, sent by someone else, and one to an Admin the viewer (m-1) sent. */
const PENDING = [
  invite('user@x.test', 'user', 'm-9'),
  invite('admin@x.test', 'admin', 'm-9'),
  invite('billing@x.test', 'billing_admin', 'm-9'),
  invite('mine@x.test', 'admin', 'm-1'),
]

async function renderAs(role: string, granted: string[]) {
  const fetch = async (input: Request) =>
    new URL(input.url).pathname.endsWith('/invites')
      ? json({ invites: PENDING })
      : new Response(null, { status: 404 })
  state.granted = granted
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role,
  }
  const router = createMemoryRouter([{ path: '/users/invite', element: <InviteUsersPage /> }], {
    initialEntries: ['/users/invite'],
  })
  render(
    <I18nextProvider i18n={createI18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  )
}

/** Whether the pending invite to `email` offers Resend and Withdraw. */
async function actionsFor(email: string): Promise<boolean> {
  const row = (await screen.findAllByText(email))[0]?.closest('tr')
  if (!row) throw new Error(`no row for ${email}`)
  const resend = within(row).queryByRole('button', { name: 'Resend' })
  const revoke = within(row).queryByRole('button', { name: 'Withdraw' })
  expect(Boolean(resend)).toBe(Boolean(revoke))
  return Boolean(resend)
}

describe('pending invites, as the identity service lets each role resend or withdraw them', () => {
  it('lets an Owner act on every invite', async () => {
    await renderAs('owner', ['settings', 'billing', 'users', 'audit', 'sso', 'assign_roles'])
    for (const i of PENDING) expect(await actionsFor(i.email)).toBe(true)
  })

  it('lets an Admin act on a User’s invite and their own, not on an Admin’s or a Billing Admin’s', async () => {
    await renderAs('admin', ['settings', 'users'])
    expect(await actionsFor('user@x.test')).toBe(true)
    expect(await actionsFor('admin@x.test')).toBe(false)
    expect(await actionsFor('billing@x.test')).toBe(false)
    expect(await actionsFor('mine@x.test')).toBe(true)
  })

  it('refuses a Billing Admin granted users the page, as it refuses them every invite', async () => {
    await renderAs('billing_admin', ['billing', 'users'])
    expect(
      await screen.findByText('Your role cannot invite people. Ask an Owner or an Admin.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Resend' })).toBeNull()
  })
})
