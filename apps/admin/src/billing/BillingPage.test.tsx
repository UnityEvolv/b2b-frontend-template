// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import BillingPage from './BillingPage'

const org = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => org.current,
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

/**
 * A deployment whose registry has a product's limit (projects), feature
 * (Gantt charts) and band (Scale-up, labelled by the product) beside the
 * template's: none of them is named in the frontend.
 */
const catalogue = {
  bands: [
    {
      name: 'free',
      label: 'Free',
      contractual: false,
      limits: { users: 5, projects: 3 },
      features: [],
    },
    {
      name: 'team',
      label: 'Team',
      contractual: false,
      limits: { users: 25, projects: 0 },
      features: ['gantt'],
    },
    {
      name: 'scale_up',
      label: 'Scale-up (annual)',
      contractual: false,
      limits: { users: 0, projects: 0 },
      features: ['gantt', 'scim'],
    },
    {
      name: 'enterprise',
      label: 'Enterprise',
      contractual: true,
      limits: { users: 0, projects: 0 },
      features: ['gantt', 'scim'],
    },
  ],
  limits: [
    { key: 'users', label: 'users' },
    { key: 'projects', label: 'projects' },
  ],
  features: [
    { key: 'scim', label: 'SCIM provisioning' },
    { key: 'gantt', label: 'Gantt charts' },
  ],
}

function renderBilling() {
  const calls: string[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    calls.push(path)
    if (path.endsWith('/billing/invoices')) return json({ invoices: [] })
    if (path.endsWith('/billing')) {
      const price = (amount: number) => ({ amount, currency: 'usd', interval: 'month' })
      return json({
        band: 'team',
        state: 'active',
        auto_upgrade: false,
        can_manage_auto_upgrade: true,
        trial_available: false,
        invoiced: false,
        active_members: 12,
        users_cap: 25,
        next_band: 'scale_up',
        bands: ['free', 'team', 'scale_up'],
        prices: { team: price(4900), scale_up: price(19900) },
      })
    }
    if (path.endsWith('/v1/plans')) return json(catalogue)
    if (path.endsWith('/organizations/org-1/plan')) {
      return json({
        org_id: 'org-1',
        plan: 'team',
        label: 'Team',
        contractual: false,
        limits: { users: 25, projects: 0 },
        features: ['gantt'],
        usage: { users: 12 },
      })
    }
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
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>
    </I18nextProvider>,
  )
  return calls
}

describe('BillingPage', () => {
  it('offers the bands billing lists, free as a downgrade, by the catalogue’s labels', async () => {
    renderBilling()
    const picker = await screen.findByRole('combobox', {}, { timeout: 5000 })
    const options = within(picker)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
    // Lowest first, the unpriced lowest band too; never the band it is on or a contractual one.
    expect(options).toEqual(['', 'free', 'scale_up'])
    expect(await within(picker).findByRole('option', { name: /^Free/ })).toBeTruthy()
    expect(within(picker).getByRole('option', { name: /Scale-up \(annual\)/ })).toBeTruthy()
  })

  it('shows every limit the plan sets, a product’s too, with usage where counted', async () => {
    const calls = renderBilling()
    const limits = await screen.findByRole(
      'list',
      { name: 'What the plan allows' },
      { timeout: 5000 },
    )
    const rows = within(limits)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(rows).toEqual(['Users: 12 of 25', 'Projects: No limit'])
    const features = screen.getByRole('list', { name: 'Included' })
    expect(within(features).getByText('Gantt charts')).toBeTruthy()
    expect(screen.getByText('Team', { selector: 'p, p *' })).toBeTruthy()
    // Billing and the organization service's plan reads only: no other service's counts.
    expect(calls.every((c) => c.startsWith('/billing/') || c.startsWith('/organization/'))).toBe(
      true,
    )
    expect(calls).toContain('/organization/v1/plans')
    expect(calls).toContain('/organization/v1/organizations/org-1/plan')
  })
})
