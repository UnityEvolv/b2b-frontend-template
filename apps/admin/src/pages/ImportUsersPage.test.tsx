// @vitest-environment jsdom
import { createI18n } from '@b2b-template/i18n'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import ImportUsersPage from './ImportUsersPage'

const state = vi.hoisted(() => ({ org: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
}))

function renderAs(role: string) {
  state.org = { api: {}, orgId: 'org-1', membershipId: 'm-1', role }
  const router = createMemoryRouter([{ path: '/users/import', element: <ImportUsersPage /> }], {
    initialEntries: ['/users/import'],
  })
  render(
    <I18nextProvider i18n={createI18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  )
}

describe('the bulk import', () => {
  // The route lets in whoever holds the users permission, which an Owner may
  // grant a Billing Admin; the identity service still refuses them every role.
  it('refuses a Billing Admin, who may hand out no role', async () => {
    renderAs('billing_admin')
    expect(
      await screen.findByText('Your role cannot invite people. Ask an Owner or an Admin.'),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('opens for an Admin', async () => {
    renderAs('admin')
    await screen.findByRole('heading', { level: 1 })
    expect(
      screen.queryByText('Your role cannot invite people. Ask an Owner or an Admin.'),
    ).toBeNull()
  })
})
