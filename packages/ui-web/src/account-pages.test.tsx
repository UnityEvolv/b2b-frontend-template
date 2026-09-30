// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createI18n } from '@b2b-template/i18n'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import {
  AcceptInvitePage,
  ForgotPasswordPage,
  SetPasswordPage,
  VerifyEmailPage,
} from './account-pages'
import type { AppDefinition } from './app'
import { createAuth } from './auth'
import { buildRoutes } from './routing'
import { AppProviders } from './start'
import { fakeIdentity } from '../test/fake-identity'
import { pageNamed } from '../test/render-app'

const WAIT = { timeout: 5000 }
const page = (Component: () => React.ReactNode) => () => Promise.resolve({ default: Component })

function renderAt(path: string, fake = fakeIdentity()) {
  const auth = createAuth({
    app: 'account',
    apiOrigin: 'https://api.example.test',
    fetch: fake.fetch,
  })
  const definition: AppDefinition = {
    app: 'account',
    navNamespace: 'account',
    home: '/home',
    signInPath: '/sign-in',
    routes: [
      { path: '/home', page: pageNamed('home page') },
      { path: '/sign-in', access: 'public', page: pageNamed('sign-in page') },
      { path: '/accept-invite', access: 'public', page: page(AcceptInvitePage) },
      { path: '/verify-email', access: 'public', page: page(VerifyEmailPage) },
      { path: '/set-password', access: 'public', page: page(SetPasswordPage) },
      { path: '/forgot-password', access: 'public', page: page(ForgotPasswordPage) },
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

describe('account pages', () => {
  it('shows an invite without the whole address, accepts it once, and says what is next', async () => {
    const fake = fakeIdentity()
    fake.invites.set('tok', { status: 'open', email: 'ada@example.com', next: 'verify_email' })
    const { user } = renderAt('/accept-invite?token=tok', fake)
    expect(
      await screen.findByText(/Acme has invited you to join as Member/, {}, WAIT),
    ).toBeInTheDocument()
    expect(screen.getByText(/a\*\*\*@example.com/)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Your name/), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Accept the invitation' }))
    expect(await screen.findByText(/sent you an email/, {}, WAIT)).toBeInTheDocument()
  })

  it('explains an expired invite', async () => {
    const fake = fakeIdentity()
    fake.invites.set('old', { status: 'expired', email: 'a@example.com', next: 'sign_in' })
    renderAt('/accept-invite?token=old', fake)
    expect(await screen.findByText(/This invitation has expired/, {}, WAIT)).toBeInTheDocument()
  })

  it('verifies the address, then sets the first password against the policy', async () => {
    const { router, user } = renderAt('/verify-email?token=verify-ok')
    const password = await screen.findByLabelText(/New password/, {}, WAIT)
    expect(router.state.location.pathname).toBe('/set-password')
    await user.type(password, 'short')
    await user.type(screen.getByLabelText(/Repeat it/), 'short')
    expect(screen.getByRole('button', { name: 'Save password' })).toBeDisabled()
    await user.clear(password)
    await user.clear(screen.getByLabelText(/Repeat it/))
    await user.type(password, 'a long enough password')
    await user.type(screen.getByLabelText(/Repeat it/), 'a long enough password')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByRole('heading', { name: 'sign-in page' }, WAIT)).toBeInTheDocument()
  })

  it('refuses a dead verification link', async () => {
    renderAt('/verify-email?token=nope')
    expect(await screen.findByText(/not valid any more/, {}, WAIT)).toBeInTheDocument()
  })

  it('sends the forgot request and answers the same whatever the address', async () => {
    const fake = fakeIdentity()
    const { user } = renderAt('/forgot-password?email=ada%40example.com', fake)
    await user.click(await screen.findByRole('button', { name: 'Email me a link' }, WAIT))
    expect(await screen.findByText(/If that address has an account/, {}, WAIT)).toBeInTheDocument()
    expect(fake.forgot).toEqual(['ada@example.com'])
  })
})
