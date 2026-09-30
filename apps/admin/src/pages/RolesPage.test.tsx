// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'

import RolesPage, { toggled } from './RolesPage'

const org = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => org.current,
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

/** The page against an authorization service whose registry has a product's group too. */
function renderRoles() {
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    if (path.endsWith('/v1/permission-groups')) {
      return json({
        groups: [
          {
            key: 'users',
            label: 'User management',
            description: 'Invite, deactivate and change people.',
            default_roles: ['admin'],
          },
          {
            key: 'projects',
            label: 'Projects',
            description: 'Create and archive projects.',
            default_roles: ['admin'],
          },
        ],
        owner_only: ['transfer_ownership'],
      })
    }
    if (path.endsWith('/permissions')) {
      return json({ admin: ['users', 'projects'], billing_admin: [], warnings: [] })
    }
    if (path.endsWith('/ownership-transfers')) return json({ transfers: [] })
    if (path.endsWith('/memberships')) return json({ memberships: [] })
    return new Response(null, { status: 404 })
  }
  org.current = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role: 'owner',
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <RolesPage />
    </I18nextProvider>,
  )
}

describe('the permission matrix', () => {
  it('turns one group on or off for one role and leaves the other alone', () => {
    const config = { admin: ['users', 'audit'], billing_admin: ['billing'] }
    const on = toggled(config, 'admin', 'billing', true)
    expect(on).toEqual({ admin: ['users', 'audit', 'billing'], billing_admin: ['billing'] })
    expect(toggled(on, 'admin', 'billing', true).admin).toEqual(['users', 'audit', 'billing'])
    expect(toggled(on, 'billing_admin', 'billing', false)).toEqual({
      admin: ['users', 'audit', 'billing'],
      billing_admin: [],
    })
  })

  it('shows every registered group with its label and description, a product’s too', async () => {
    renderRoles()
    const table = await screen.findByRole('table', {}, { timeout: 5000 })
    expect(within(table).getByText('Projects')).toBeTruthy()
    expect(within(table).getByText('Create and archive projects.')).toBeTruthy()
    expect(within(table).getByText('User management')).toBeTruthy()
    const box = within(table).getByRole('checkbox', { name: 'Projects for Admin' })
    expect((box as HTMLInputElement).checked).toBe(true)
    // Owner-only actions are never offered.
    expect(within(table).queryByText(/transfer_ownership/)).toBeNull()
  })
})
