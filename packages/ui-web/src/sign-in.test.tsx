// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createI18n } from '@b2b-template/i18n'
import { act, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AppDefinition } from './app'
import { createAuth } from './auth'
import { buildRoutes } from './routing'
import { AppProviders } from './start'
import { fakeIdentity } from '../test/fake-identity'
import { pageNamed } from '../test/render-app'

/** The app with its real sign-in page and the fake services behind it. */
function renderSignIn({
  app = 'account',
  roles,
  path = '/sign-in?next=/offices',
  fake = fakeIdentity(),
}: {
  app?: 'account' | 'admin'
  roles?: string[]
  path?: string
  fake?: ReturnType<typeof fakeIdentity>
} = {}) {
  const auth = createAuth({
    // The identity service's contract names the member app `ofis`.
    app: app === 'account' ? 'ofis' : app,
    apiOrigin: 'https://api.example.test',
    fetch: fake.fetch,
    ...(roles ? { roles } : {}),
  })
  const definition: AppDefinition = {
    app,
    home: '/offices',
    signInPath: '/sign-in',
    routes: [
      { path: '/offices', page: pageNamed('offices page') },
      {
        path: '/sign-in',
        access: 'public',
        page: () => import('./sign-in').then((m) => ({ default: m.SignInPage })),
      },
    ],
    sessionSource: auth.sessionSource,
    auth,
  }
  const router = createMemoryRouter(buildRoutes(definition), { initialEntries: [path] })
  render(
    <AppProviders definition={definition} i18n={createI18n()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { router, fake, user: userEvent.setup() }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// Rendering the whole shell is slow when the full suite shares the machine.
describe('SignInPage', { timeout: 20_000 }, () => {
  it('signs a guest with a local account in from the email, and lands where they were going', async () => {
    const fake = fakeIdentity()
    fake.accounts.set('gus@elsewhere.example', {
      email: 'gus@elsewhere.example',
      password: 'a long password',
      membership: { orgId: 'acme', role: 'guest' },
    })
    const { router, user } = renderSignIn({ fake })

    await user.type(
      await screen.findByLabelText(/Email address/, {}, { timeout: 5000 }),
      'gus@elsewhere.example',
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    // No org is named: only the password field appears.
    const password = await screen.findByLabelText(/Password/)
    expect(screen.queryByText(/acme/i)).not.toBeInTheDocument()
    await user.type(password, 'wrong password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('That email and password do not match.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/Password/))
    await user.type(screen.getByLabelText(/Password/), 'a long password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(
      await screen.findByRole('heading', { name: 'offices page' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/offices')
  })

  it('sends an employee at an Entra organization to the provider', async () => {
    const fake = fakeIdentity()
    fake.entraDomains.add('acme.com')
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const { user } = renderSignIn({ fake })
    await user.type(
      await screen.findByLabelText(/Email address/, {}, { timeout: 5000 }),
      'ada@acme.com',
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(assign).toHaveBeenCalled())
    const url = new URL(assign.mock.calls[0]![0] as string)
    expect(url.pathname).toBe('/identity/v1/sign-in/start')
    expect(url.searchParams.get('email')).toBe('ada@acme.com')
    expect(url.searchParams.get('next')).toBe('/offices')
    vi.unstubAllGlobals()
  })

  it('in the desktop app, signs in through the browser and finishes back in the app', async () => {
    const fake = fakeIdentity()
    fake.entraDomains.add('acme.com')
    fake.accounts.set('ada@acme.com', {
      email: 'ada@acme.com',
      password: 'unused',
      membership: { orgId: 'acme', role: 'user' },
    })
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    let deliver: ((result: unknown) => void) | null = null
    const signInWithBrowser = vi.fn(async (_url: string) => true)
    vi.stubGlobal('b2bappDesktop', {
      platform: 'win32',
      version: '1',
      signInWithBrowser,
      onSignIn: (handler: (result: unknown) => void) => {
        deliver = handler
        return () => {}
      },
    })
    const { router, user } = renderSignIn({ fake })
    await user.type(
      await screen.findByLabelText(/Email address/, {}, { timeout: 5000 }),
      'ada@acme.com',
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText(/opened in your browser/)
    expect(assign).not.toHaveBeenCalled()
    const url = new URL(signInWithBrowser.mock.calls[0]![0])
    expect(url.searchParams.get('client')).toBe('desktop')

    // The browser comes back through the app's scheme; the shell hands over the code.
    fake.desktopCodes.set('code-1', { email: 'ada@acme.com', verifier: 'v-1' })
    act(() => deliver!({ code: 'code-1', verifier: 'v-1', next: '/offices' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/offices'))
    expect(await screen.findByText('offices page')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('asks for the code when a second factor is due', async () => {
    const fake = fakeIdentity()
    fake.accounts.set('m@example.com', {
      email: 'm@example.com',
      password: 'a long password',
      mfaCode: '123456',
      membership: { orgId: 'acme', role: 'user' },
    })
    const { router, user } = renderSignIn({ fake })
    await user.type(
      await screen.findByLabelText(/Email address/, {}, { timeout: 5000 }),
      'm@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(await screen.findByLabelText(/Password/), 'a long password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    const code = await screen.findByLabelText(/Code/)
    await user.type(code, '000000')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('That code is not right.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/Code/))
    await user.type(screen.getByLabelText(/Code/), '123456')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      await screen.findByRole('heading', { name: 'offices page' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/offices')
  })

  it('explains what the provider sent back', async () => {
    renderSignIn({ path: '/sign-in?error=membership_inactive' })
    expect(
      await screen.findByText('Your account in this organization has been deactivated.'),
    ).toBeInTheDocument()
  })

  it('refuses a plain User in the admin app, even with the right password', async () => {
    const fake = fakeIdentity()
    fake.accounts.set('u@example.com', {
      email: 'u@example.com',
      password: 'a long password',
      membership: { orgId: 'acme', role: 'user' },
    })
    const { user, router } = renderSignIn({
      app: 'admin',
      roles: ['owner', 'admin', 'billing_admin'],
      fake,
      path: '/sign-in',
    })
    await user.type(
      await screen.findByLabelText(/Email address/, {}, { timeout: 5000 }),
      'u@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(await screen.findByLabelText(/Password/), 'a long password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(
      await screen.findByText(/This app is for administrators/, {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(fake.signedIn).toBe(false)
  })
})
