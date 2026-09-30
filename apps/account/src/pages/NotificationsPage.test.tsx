// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import NotificationsPage from './NotificationsPage'

const org = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => org.current,
}))
vi.mock('../notify/push', () => ({
  pushState: async () => 'unsupported',
  enablePush: async () => 'unsupported',
  disablePush: async () => 'unsupported',
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const category = (id: string, label: string, audience: 'member' | 'admin', channels: string[]) => ({
  id,
  label,
  description: `${label}, described by the registry.`,
  audience,
  default_channels: { in_app: true, push: false, email: false, digest: true },
  channels,
  quiet_hours: true,
  batched: false,
})

function renderPage(role: string, unsubscribe?: string) {
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    if (path.endsWith('/v1/notification-categories')) {
      return json({
        categories: [
          category('security', 'Security', 'member', ['in_app', 'push', 'email']),
          category('project_updates', 'Project updates', 'member', ['in_app', 'digest']),
          category('admin_notices', 'Admin notices', 'admin', ['in_app', 'email', 'digest']),
        ],
      })
    }
    if (path.includes('/v1/unsubscribe/')) return json({ category: 'digest' })
    if (path.endsWith('/notification-preferences')) {
      return json({
        channels: { security: { in_app: true, push: true, email: false, digest: false } },
        push_previews: false,
        previews_allowed: true,
        digest_minute: null,
        quiet_hours: { enabled: false, start_minute: 1080, end_minute: 480, days: [] },
        muted: [],
      })
    }
    return new Response(null, { status: 404 })
  }
  org.current = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role,
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter initialEntries={[unsubscribe ? `/?unsubscribe=${unsubscribe}` : '/']}>
        <NotificationsPage />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

describe('NotificationsPage', () => {
  it('shows a member the member categories, a product’s too, with only their channels', async () => {
    renderPage('user')
    const table = await screen.findByRole('table', {}, { timeout: 5000 })
    const row = within(table).getByRole('row', { name: /Project updates/ })
    expect(within(row).getByText('Project updates, described by the registry.')).toBeTruthy()
    const digest = within(row).getByRole('checkbox', { name: 'Project updates: Daily digest' })
    expect((digest as HTMLInputElement).checked).toBe(true)
    expect(within(row).queryByRole('checkbox', { name: /Push/ })).toBeNull()
    const security = within(table).getByRole('row', { name: /Security/ })
    const push = within(security).getByRole('checkbox', { name: 'Security: Push' })
    expect((push as HTMLInputElement).checked).toBe(true)
    expect(within(table).queryByText('Admin notices')).toBeNull()
  })

  it('shows an admin the admin categories too', async () => {
    renderPage('admin')
    const table = await screen.findByRole('table', {}, { timeout: 5000 })
    expect(within(table).getByText('Admin notices')).toBeTruthy()
  })

  it('says so when the digest link turned the digest off', async () => {
    renderPage('user', 'tok')
    expect(await screen.findByText('The daily digest is off.', {}, { timeout: 5000 })).toBeTruthy()
  })
})
