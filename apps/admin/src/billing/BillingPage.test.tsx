// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import BillingPage from './BillingPage'

const org = vi.hoisted(() => ({ current: null as unknown }))
const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('@unityevolv/unitykit', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  toast: toasts,
}))
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

const notConfigured = {
  code: 'billing.provider_not_configured',
  message: 'Paid plans are not available here: no payment provider is configured.',
}

/**
 * The page against a mocked API. provider says whether the deployment has a
 * payment provider; billing overrides the account read; orgPlan overrides
 * the org's plan read; preview answers band-preview.
 */
function renderBilling({
  provider = true,
  billing = {},
  orgPlan = {},
  preview,
}: {
  provider?: boolean
  billing?: Record<string, unknown>
  orgPlan?: Record<string, unknown>
  preview?: () => Response
} = {}) {
  const calls: string[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    calls.push(path)
    if (path.endsWith('/billing/invoices')) return json({ invoices: [] })
    if (path.endsWith('/billing/band-preview') && preview) return preview()
    if (path.endsWith('/billing/setup') && !provider) {
      return new Response(JSON.stringify(notConfigured), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }
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
        prices: provider ? { team: price(4900), scale_up: price(19900) } : {},
        provider_configured: provider,
        ...billing,
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
        overrides: [],
        usage: { users: 12 },
        ...orgPlan,
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

  it('marks what a platform operator set by agreement, with its end or none', async () => {
    renderBilling({
      orgPlan: {
        limits: { users: 75, projects: 0 },
        features: ['gantt', 'scim'],
        overrides: [
          { kind: 'limit', key: 'users', cap: 75, ends_at: '2027-01-31T12:00:00Z', in_force: true },
          { kind: 'feature', key: 'scim', allowed: true, in_force: true },
          { kind: 'feature', key: 'gantt_export', allowed: false, in_force: true },
        ],
      },
    })
    const limits = await screen.findByRole(
      'list',
      { name: 'What the plan allows' },
      { timeout: 5000 },
    )
    const until = new Date('2027-01-31T12:00:00Z').toLocaleDateString('en', {
      dateStyle: 'medium',
    })
    expect(
      within(limits)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([`Users: 12 of 75 Set by agreement until ${until}`, 'Projects: No limit'])
    const features = within(screen.getByRole('list', { name: 'Included' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(features).toEqual([
      'SCIM provisioning Set by agreement',
      'Gantt charts',
      'Gantt export: not included, by agreement Set by agreement',
    ])
  })

  it('offers no priced band and no card setup when no payment provider is configured', async () => {
    renderBilling({
      provider: false,
      billing: { band: 'scale_up', state: 'trialing', trial_available: true, next_band: undefined },
    })
    expect(
      await screen.findByText('Paid plans are not available on this deployment.', undefined, {
        timeout: 5000,
      }),
    ).toBeTruthy()
    const picker = screen.getByRole('combobox')
    const options = within(picker)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
    // Only the lowest band, to end the trial early or move down.
    expect(options).toEqual(['', 'free'])
    expect(screen.queryByRole('button', { name: /payment method/ })).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: /trial/ })).toBeTruthy()
  })

  it('offers no picker at all on the lowest band without a provider', async () => {
    renderBilling({ provider: false, billing: { band: 'free', state: 'free', next_band: 'team' } })
    await screen.findByText('Paid plans are not available on this deployment.', undefined, {
      timeout: 5000,
    })
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByText(/Next plan up/)).toBeNull()
  })

  it('offers card setup and every band when a provider is configured, with no notice', async () => {
    renderBilling()
    expect(
      await screen.findByRole('button', { name: 'Add payment method' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByRole('checkbox')).toBeTruthy()
    expect(screen.queryByText('Paid plans are not available on this deployment.')).toBeNull()
  })

  it('says the service’s words and reads the account again when told no provider is configured', async () => {
    toasts.error.mockClear()
    const calls = renderBilling({
      preview: () =>
        new Response(JSON.stringify(notConfigured), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
    })
    const user = userEvent.setup()
    const picker = await screen.findByRole('combobox', {}, { timeout: 5000 })
    await user.selectOptions(picker, 'scale_up')
    const reads = calls.filter((c) => c.endsWith('/billing')).length
    await user.click(screen.getByRole('button', { name: 'Review change' }))
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(notConfigured.message))
    await waitFor(() =>
      expect(calls.filter((c) => c.endsWith('/billing')).length).toBeGreaterThan(reads),
    )
  })

  it('points an org on the lowest band to its setup step', async () => {
    renderBilling({ billing: { band: 'free' }, orgPlan: { plan: 'free', label: 'Free' } })
    const link = await screen.findByRole('link', { name: 'Choose a plan' }, { timeout: 5000 })
    // The step's page; on it, the hint jumps to the plan card (SetupHint's own tests).
    expect(link.getAttribute('href')).toBe('/billing')
    expect(document.getElementById('choose_plan')).toBeTruthy()
  })

  it('does not point an org trying a band to the plan step', async () => {
    renderBilling({ billing: { band: 'free', state: 'trialing' } })
    await screen.findByRole('combobox', {}, { timeout: 5000 })
    expect(screen.queryByRole('link', { name: 'Choose a plan' })).toBeNull()
  })
})
