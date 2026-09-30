// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'

import { NotificationDefaults } from './NotificationDefaults'

const org = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => org.current,
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const everywhere = { in_app: true, push: true, email: true, digest: false }

describe('NotificationDefaults', () => {
  it('lists every registered category with its own label and channels, a product’s too', async () => {
    const fetch = async (input: Request) => {
      const path = new URL(input.url).pathname
      if (path.endsWith('/v1/notification-categories')) {
        return json({
          categories: [
            {
              id: 'security',
              label: 'Security',
              description: 'New sign-ins and changes to how you sign in.',
              audience: 'member',
              default_channels: everywhere,
              channels: ['in_app', 'push', 'email'],
              quiet_hours: false,
              batched: false,
            },
            {
              id: 'project_updates',
              label: 'Project updates',
              description: 'Changes to projects you follow.',
              audience: 'member',
              default_channels: { in_app: true, push: false, email: false, digest: true },
              channels: ['in_app', 'digest'],
              quiet_hours: true,
              batched: true,
            },
          ],
        })
      }
      if (path.endsWith('/notification-settings')) {
        return json({ channels: {}, previews_allowed: true })
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
        <NotificationDefaults />
      </I18nextProvider>,
    )

    const table = await screen.findByRole('table', {}, { timeout: 5000 })
    const row = within(table).getByRole('row', { name: /Project updates/ })
    expect(within(row).getByText('Changes to projects you follow.')).toBeTruthy()
    // Only the channels the category may use, starting from its defaults.
    const digest = within(row).getByRole('checkbox', { name: 'Project updates: Daily digest' })
    expect((digest as HTMLInputElement).checked).toBe(true)
    expect(within(row).queryByRole('checkbox', { name: /Push/ })).toBeNull()
    expect(within(row).queryByRole('checkbox', { name: /Email/ })).toBeNull()
    const security = within(table).getByRole('row', { name: /Security/ })
    expect(within(security).queryByRole('checkbox', { name: /Daily digest/ })).toBeNull()
    expect(within(table).getByRole('columnheader', { name: 'Daily digest' })).toBeTruthy()
  })
})
