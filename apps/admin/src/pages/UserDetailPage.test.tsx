// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { cleanup, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import UserDetailPage from './UserDetailPage'

const state = vi.hoisted(() => ({ org: null as unknown, granted: [] as string[] }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: (p: string) => state.granted.includes(p) } }),
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const OWNER = ['settings', 'billing', 'users', 'audit', 'sso', 'assign_roles']

/** Member `target` (holding `targetRole`) as seen by a member holding `role` and `granted`. */
async function renderAs(
  role: string,
  granted: string[],
  { target = 'm-2', targetRole = 'user' } = {},
) {
  const sessions: string[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    if (path.endsWith(`/memberships/${target}`)) {
      return json({
        id: target,
        org_id: 'org-1',
        role: targetRole,
        status: 'active',
        kind: 'member',
        user: { id: 'u-2', name: 'Ravi Iyer', email: 'ravi@example.org' },
        directory: {},
        created_at: '2026-09-01T09:00:00Z',
      })
    }
    if (path.endsWith('/sessions')) {
      sessions.push(path)
      return json({
        sessions: [
          {
            session_id: 's-1',
            user_agent: 'Firefox',
            created_at: '2026-09-30T09:00:00Z',
            last_seen_at: '2026-09-30T10:00:00Z',
          },
        ],
      })
    }
    if (path.endsWith('/audit-events')) return json({ events: [] })
    return new Response(null, { status: 404 })
  }
  state.granted = granted
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role,
  }
  const router = createMemoryRouter(
    [{ path: '/users/:membershipId', element: <UserDetailPage /> }],
    {
      initialEntries: [`/users/${target}`],
    },
  )
  render(
    <I18nextProvider i18n={createI18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  )
  await screen.findByRole('heading', { name: 'Ravi Iyer' }, { timeout: 5000 })
  return { sessions }
}

const button = (name: string) => screen.queryByRole('button', { name })

/** Every action on the member that the identity and user services gate on MayManage. */
const MANAGED = ['Deactivate', 'Reset two-step sign-in', 'Sign out everywhere']

async function expectManaged(sessions: string[]) {
  expect(await screen.findByText('Signed in on')).toBeTruthy()
  for (const name of MANAGED) expect(await screen.findByRole('button', { name })).toBeTruthy()
  expect(sessions).toHaveLength(1)
}

function expectNotManaged(sessions: string[]) {
  for (const name of MANAGED) expect(button(name)).toBeNull()
  expect(screen.queryByText('Signed in on')).toBeNull()
  expect(sessions).toEqual([])
}

describe('one person, as the API lets each role act on them', () => {
  it('offers a Billing Admin no status, second-factor or session action', async () => {
    const { sessions } = await renderAs('billing_admin', ['billing'])
    expectNotManaged(sessions)
    expect(screen.getByRole('combobox', { name: /Role/ })).toHaveProperty('disabled', true)
  })

  it('offers a Billing Admin granted users none either, on anyone', async () => {
    for (const targetRole of ['user', 'billing_admin']) {
      const { sessions } = await renderAs('billing_admin', ['billing', 'users'], { targetRole })
      expectNotManaged(sessions)
      cleanup()
    }
  })

  it('lets an Admin with the users permission act on a User and a Guest', async () => {
    for (const targetRole of ['user', 'guest']) {
      const { sessions } = await renderAs('admin', ['settings', 'users'], { targetRole })
      await expectManaged(sessions)
      cleanup()
    }
  })

  it('offers an Admin nothing on an Owner, an Admin or a Billing Admin, and asks for no sessions', async () => {
    for (const targetRole of ['owner', 'admin', 'billing_admin']) {
      const { sessions } = await renderAs('admin', ['settings', 'users'], { targetRole })
      expectNotManaged(sessions)
      cleanup()
    }
  })

  it('offers an Admin nothing on their own membership', async () => {
    const { sessions } = await renderAs('admin', ['settings', 'users'], {
      target: 'm-1',
      targetRole: 'admin',
    })
    expectNotManaged(sessions)
  })

  it('offers an Admin without the users permission nothing, even on a User', async () => {
    const { sessions } = await renderAs('admin', ['settings'])
    expectNotManaged(sessions)
  })

  it('lets an Owner act on anyone', async () => {
    for (const targetRole of ['owner', 'admin', 'billing_admin', 'user']) {
      const { sessions } = await renderAs('owner', OWNER, { targetRole })
      await expectManaged(sessions)
      cleanup()
    }
  })

  it('lets an Owner act on themselves, but not change their own role', async () => {
    const { sessions } = await renderAs('owner', OWNER, { target: 'm-1', targetRole: 'owner' })
    await expectManaged(sessions)
    expect(screen.getByRole('combobox', { name: /Role/ })).toHaveProperty('disabled', true)
  })
})
