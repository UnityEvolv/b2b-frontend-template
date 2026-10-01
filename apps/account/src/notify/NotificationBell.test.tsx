// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { NotificationBell } from './NotificationBell'

const org = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => org.current,
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const category = (id: string, label: string, audience: 'member' | 'admin' = 'member') => ({
  id,
  label,
  description: '',
  audience,
  default_channels: { in_app: true, push: false, email: false, digest: false },
  channels: ['in_app'],
  quiet_hours: false,
  batched: true,
})

const entry = (id: string, category: string, extra: Record<string, unknown> = {}) => ({
  id,
  category,
  kind: 'updated',
  heading: '',
  line: '',
  data: {},
  link: '/',
  count: 1,
  items: [],
  occurred_at: '2026-10-01T09:00:00Z',
  read: false,
  ...extra,
})

function renderBell() {
  const asked: (string | null)[] = []
  const fetch = async (input: Request) => {
    const url = new URL(input.url)
    if (url.pathname.endsWith('/v1/notification-categories')) {
      return json({
        categories: [
          category('security', 'Security'),
          category('project_updates', 'Project updates'),
          category('admin_notices', 'Admin notices', 'admin'),
        ],
      })
    }
    if (url.pathname.endsWith('/notifications')) {
      const only = url.searchParams.get('category')
      asked.push(only)
      const all = [
        entry('e-1', 'project_updates', { count: 3, heading: '3 projects were archived' }),
        entry('e-2', 'security', {
          heading: 'A new sign-in',
          line: 'Firefox on Windows, near Leeds.',
          data: { heading: 'Not what the bell says' },
        }),
        // No copy and no heading: the category's label names it, and the app counts it.
        entry('e-3', 'admin_notices', { count: 2 }),
      ]
      return json({ entries: all.filter((e) => !only || e.category === only), unread: 3 })
    }
    return new Response(null, { status: 404 })
  }
  org.current = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role: 'member',
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </I18nextProvider>,
  )
  return { asked, user: userEvent.setup() }
}

describe('NotificationBell', () => {
  it('says each entry in the server’s words, its category’s label only without them', async () => {
    const { user } = renderBell()
    await user.click(
      await screen.findByRole('button', { name: /Notifications, 3 unread/ }, { timeout: 5000 }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' })
    expect(await within(dialog).findByText('3 projects were archived')).toBeTruthy()
    expect(within(dialog).queryByText('Project updates (3)')).toBeNull()
    expect(within(dialog).getByText('A new sign-in')).toBeTruthy()
    expect(within(dialog).getByText('Firefox on Windows, near Leeds.')).toBeTruthy()
    expect(within(dialog).queryByText('Not what the bell says')).toBeNull()
    expect(await within(dialog).findByText('Admin notices (2)')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Mentions' })).toBeNull()
  })

  it('narrows the feed to one registered category', async () => {
    const { user, asked } = renderBell()
    await user.click(
      await screen.findByRole('button', { name: /Notifications, 3 unread/ }, { timeout: 5000 }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' })
    const filter = await within(dialog).findByRole('combobox', {
      name: 'Show notifications about',
    })
    expect(
      within(filter)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Everything', 'Security', 'Project updates', 'Admin notices'])

    await user.selectOptions(filter, 'project_updates')
    await vi.waitFor(() => expect(asked).toContain('project_updates'))
    await vi.waitFor(() => expect(within(dialog).queryByText('Admin notices (2)')).toBeNull())
    expect(within(dialog).getByText('3 projects were archived')).toBeTruthy()
  })
})
