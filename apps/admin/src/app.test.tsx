// @vitest-environment jsdom
import { createI18n } from '@b2b-template/i18n'
import {
  AppProviders,
  buildRoutes,
  memorySessionSource,
  type AppDefinition,
} from '@b2b-template/ui-web'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let definition: AppDefinition

beforeAll(async () => {
  // The development session, so importing the app makes no sign-in client.
  vi.stubEnv('VITE_DEV_SESSION', '1')
  definition = (await import('./app')).definition
})
afterAll(() => vi.unstubAllEnvs())

/** The admin app's own routes, each page a heading that names its path, as a session holding `permissions`. */
function visit(path: string, permissions: string[]) {
  const routes = definition.routes.map((route) => ({
    ...route,
    page: async () => ({ default: () => <h1>{route.path}</h1> }),
  }))
  const app: AppDefinition = {
    ...definition,
    routes,
    sessionSource: memorySessionSource({
      user: {
        id: 'u-1',
        email: 'bea@example.org',
        displayName: 'Bea',
        preferences: { theme: 'system', language: null },
      },
      permissions,
    }),
  }
  delete app.auth
  delete app.banner
  const router = createMemoryRouter(buildRoutes(app), { initialEntries: [path] })
  render(
    <AppProviders definition={app} i18n={createI18n()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('the admin app’s routes', () => {
  // A Billing Admin holds billing only; the identity and user services refuse
  // their invites and imports, so the pages are not theirs either.
  it.each(['/users/invite', '/users/import'])('refuses %s to a Billing Admin', async (path) => {
    visit(path, ['billing'])
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: path })).toBeNull()
  })

  it('opens the invite page to whoever holds the users permission', async () => {
    visit('/users/invite', ['settings', 'users', 'audit', 'sso'])
    expect(
      await screen.findByRole('heading', { name: '/users/invite' }, { timeout: 5000 }),
    ).toBeTruthy()
  })

  it('leaves the people list to every role the app admits', async () => {
    visit('/users', ['billing'])
    expect(await screen.findByRole('heading', { name: '/users' }, { timeout: 5000 })).toBeTruthy()
  })

  // The identity service asks for sso alone; a role may hold it without settings.
  it('opens single sign-on to whoever holds sso, without settings', async () => {
    visit('/sso', ['sso'])
    expect(await screen.findByRole('heading', { name: '/sso' }, { timeout: 5000 })).toBeTruthy()
  })

  it('refuses single sign-on to settings without sso', async () => {
    visit('/sso', ['settings', 'users'])
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '/sso' })).toBeNull()
  })

  it('lists single sign-on in the nav for sso, and not for settings alone', async () => {
    visit('/users', ['sso'])
    expect(
      await screen.findByRole('link', { name: 'Single sign-on' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull()
  })
})
