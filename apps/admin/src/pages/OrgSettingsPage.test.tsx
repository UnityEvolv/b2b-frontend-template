// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { cleanup, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import OrgSettingsPage from './OrgSettingsPage'

const state = vi.hoisted(() => ({ org: null as unknown, granted: [] as string[] }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: (p: string) => state.granted.includes(p) } }),
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const OWNER = ['settings', 'billing', 'users', 'audit', 'sso', 'assign_roles', 'claim_domain']
const ADMIN = ['settings', 'users', 'audit', 'sso']
const BILLING_ADMIN = ['billing', 'users']

const CLAIMS = {
  none: {},
  pending: { pending_domain: 'example.org', txt_name: '_claim.example.org', txt_value: 'v=1' },
  verified: { domain: 'example.org' },
}

/** The settings page as a member holding `role` and `granted` sees a claim in state `claim`. */
async function renderAs(role: string, granted: string[], claim: keyof typeof CLAIMS) {
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    if (path.endsWith('/organizations/org-1')) {
      return json({ id: 'org-1', name: 'Acme', time_zone: 'UTC' })
    }
    if (path.endsWith('/domain')) return json(CLAIMS[claim])
    if (path.endsWith('/session-policy')) {
      return json({
        lifetime_seconds: 90 * 86400,
        idle_timeout_seconds: 14 * 86400,
        mfa_required: false,
        limits: {
          min_lifetime_seconds: 86400,
          max_lifetime_seconds: 365 * 86400,
          max_idle_timeout_seconds: 90 * 86400,
        },
      })
    }
    return new Response(null, { status: 404 })
  }
  state.granted = granted
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role,
  }
  const router = createMemoryRouter([{ path: '/settings', element: <OrgSettingsPage /> }], {
    initialEntries: ['/settings'],
  })
  render(
    <I18nextProvider i18n={createI18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  )
  await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })
}

const button = (name: string) => screen.queryByRole('button', { name })
const OWNER_ONLY = 'Only an Owner claims and verifies the domain.'

describe('the domain claim, as the organization service lets each role act on it', () => {
  it('lets an Owner claim a domain', async () => {
    await renderAs('owner', OWNER, 'none')
    expect(button('Claim')).toBeTruthy()
    expect(screen.queryByText(OWNER_ONLY)).toBeNull()
  })

  it('lets an Owner verify a pending claim', async () => {
    await renderAs('owner', OWNER, 'pending')
    expect(button('Verify now')).toBeTruthy()
  })

  it('shows an Admin that no domain is claimed, and no way to claim one', async () => {
    await renderAs('admin', ADMIN, 'none')
    expect(screen.getByText('No domain is claimed.')).toBeTruthy()
    expect(screen.getByText(OWNER_ONLY)).toBeTruthy()
    expect(button('Claim')).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Domain' })).toBeNull()
  })

  it('shows an Admin a pending claim and its record, but no Verify', async () => {
    await renderAs('admin', ADMIN, 'pending')
    expect(screen.getByText('_claim.example.org')).toBeTruthy()
    expect(button('Verify now')).toBeNull()
    expect(screen.getByText(OWNER_ONLY)).toBeTruthy()
  })

  it('shows an Admin a verified domain', async () => {
    await renderAs('admin', ADMIN, 'verified')
    expect(screen.getByText('example.org')).toBeTruthy()
    expect(button('Claim')).toBeNull()
  })

  // The route asks for settings, which a Billing Admin lacks; were they let
  // in, the page would still offer no claim.
  it('offers a Billing Admin granted users no claim or verify', async () => {
    for (const claim of ['none', 'pending'] as const) {
      await renderAs('billing_admin', BILLING_ADMIN, claim)
      expect(button('Claim')).toBeNull()
      expect(button('Verify now')).toBeNull()
      cleanup()
    }
  })
})
