// @vitest-environment jsdom
import { createI18n } from '@b2b-template/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import ImportUsersPage from './ImportUsersPage'

const state = vi.hoisted(() => ({ org: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
}))

/** The user service's import, as far as the page asks it: the sheet's columns, then the rows. */
const api = (rows: unknown[]) => ({
  user: {
    POST: async (path: string) =>
      path.endsWith('/columns')
        ? { data: { columns: ['email', 'name', 'role'], rows: rows.length, sample: [] } }
        : {
            data: {
              dry_run: true,
              summary: {
                rows: rows.length,
                valid: rows.filter((r) => (r as { status: string }).status !== 'failed').length,
                invalid: rows.filter((r) => (r as { status: string }).status === 'failed').length,
                invited: 0,
              },
              rows,
            },
          },
  },
})

function renderAs(role: string, rows: unknown[] = []) {
  state.org = { api: api(rows), orgId: 'org-1', membershipId: 'm-1', role }
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

  it('tells an Owner a sheet may name Admin, Billing admin or Member', async () => {
    renderAs('owner')
    await mapSheet()
    expect(screen.getByText(/Roles you may give: Admin, Billing admin, Member./)).toBeTruthy()
  })

  it('tells an Admin a sheet may name Member only, and shows a refused row in the server’s words', async () => {
    renderAs('admin', [
      {
        row: 2,
        email: 'ana@x.test',
        name: 'Ana',
        role: 'user',
        status: 'would_invite',
        errors: [],
      },
      {
        row: 3,
        email: 'bo@x.test',
        name: 'Bo',
        role: 'billing_admin',
        status: 'failed',
        errors: [{ code: 'role_invalid', message: 'You may not invite a billing admin.' }],
      },
    ])
    const user = await mapSheet()
    expect(screen.getByText(/Roles you may give: Member./)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Check every row' }))
    expect(await screen.findByText('You may not invite a billing admin.')).toBeTruthy()
    expect(screen.getAllByText('Problem').length).toBeGreaterThan(0)
  })
})

/** Pick a sheet and reach the column mapping. */
async function mapSheet() {
  const user = userEvent.setup()
  await screen.findByRole('heading', { level: 1 })
  const input = document.querySelector('input[type=file]') as HTMLInputElement
  await user.upload(input, new File(['email,name,role'], 'people.csv', { type: 'text/csv' }))
  await screen.findByText(/Match the columns of people.csv/)
  return user
}
