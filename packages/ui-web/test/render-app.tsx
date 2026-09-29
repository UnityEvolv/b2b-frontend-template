import { createI18n } from '@b2b-template/i18n'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import type { AppDefinition, AppRoute } from '../src/app'
import { buildRoutes } from '../src/routing'
import { memorySessionSource, type Session, type SessionSource } from '../src/session'
import { AppProviders } from '../src/start'

export const signedIn = (
  permissions: string[] = [],
  overrides: Partial<Session['user']> = {},
): Session => ({
  user: {
    id: 'u-1',
    email: 'asha@example.org',
    displayName: 'Asha Rao',
    preferences: { theme: 'system', language: null },
    ...overrides,
  },
  permissions,
})

/** A page that says which route it is, so a test can tell where it landed. */
export const pageNamed = (name: string) => () => Promise.resolve({ default: () => <h1>{name}</h1> })

export const ROUTES: AppRoute[] = [
  {
    path: '/users',
    page: pageNamed('users page'),
    nav: { key: 'users', icon: 'users', label: (t) => t('admin:nav.users') },
  },
  {
    path: '/billing',
    page: pageNamed('billing page'),
    permission: 'billing.read',
    nav: { key: 'billing', label: () => 'Billing' },
  },
  { path: '/sign-in', access: 'public', page: pageNamed('sign-in page') },
]

/** The app exactly as `startApp` assembles it, on a memory router. */
export function renderApp({
  path = '/',
  session = signedIn(),
  source,
  routes = ROUTES,
}: {
  path?: string
  session?: Session | null
  source?: SessionSource
  routes?: AppRoute[]
} = {}) {
  const definition: AppDefinition = {
    app: 'admin',
    navNamespace: 'admin',
    home: '/users',
    signInPath: '/sign-in',
    routes,
    sessionSource: source ?? memorySessionSource(session),
  }
  const router = createMemoryRouter(buildRoutes(definition), { initialEntries: [path] })
  const view = render(
    <AppProviders definition={definition} i18n={createI18n()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...view, router, definition }
}
