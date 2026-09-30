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

describe('BillingPage', () => {
  it('offers the bands and caps the billing service answers with, a product’s band too', async () => {
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
          next_band: 'business',
          prices: { team: price(4900), business: price(9900), 'scale-up': price(19900) },
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

    const picker = await screen.findByRole('combobox', {}, { timeout: 5000 })
    const options = within(picker)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
    expect(options).toEqual(['', 'business', 'scale-up'])
    expect(within(picker).getByRole('option', { name: /Scale up/ })).toBeTruthy()
    expect(screen.getByText(/12 of 25/)).toBeTruthy()
    // Nothing but billing is read for the page: no other service's counts.
    expect(calls.every((c) => c.startsWith('/billing/'))).toBe(true)
  })
})
