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

/** The account app's own routes, each page a heading that names its path, as a session holding `permissions`. */
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
  delete app.headerActions
  const router = createMemoryRouter(buildRoutes(app), { initialEntries: [path] })
  render(
    <AppProviders definition={app} i18n={createI18n()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('the account app’s routes', () => {
  // Any member makes their own tokens; the identity service checks nothing more of them.
  it('opens personal access tokens to any member, and lists it in the nav', async () => {
    visit('/settings/tokens', [])
    expect(
      await screen.findByRole('heading', { name: '/settings/tokens' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Access tokens' }).length).toBeGreaterThan(0)
  })
})
