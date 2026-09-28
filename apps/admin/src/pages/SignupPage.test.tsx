// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createI18n } from '@b2b-template/i18n'
import { AppProviders, buildRoutes, createAuth, type AppDefinition } from '@b2b-template/ui-web'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import { SignupPage } from './SignupPage'

/** The signup page against a fake organization service. */
function renderSignup() {
  const bodies: unknown[] = []
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    if (url.pathname.endsWith('/v1/signups')) {
      const body = (await request.json()) as { email: string }
      bodies.push(body)
      if (body.email.endsWith('@claimed.example')) {
        return new Response(
          JSON.stringify({ code: 'signup.domain_claimed', message: 'Claimed.' }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      return new Response(null, { status: 202 })
    }
    return new Response(JSON.stringify({ code: 'session.none', message: 'Not signed in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const auth = createAuth({ app: 'admin', apiOrigin: 'https://api.example.test', fetch })
  const definition: AppDefinition = {
    app: 'admin',
    home: '/users',
    signInPath: '/sign-in',
    routes: [{ path: '/signup', access: 'public', page: async () => ({ default: SignupPage }) }],
    sessionSource: auth.sessionSource,
    auth,
  }
  const router = createMemoryRouter(buildRoutes(definition), { initialEntries: ['/signup'] })
  render(
    <AppProviders definition={definition} i18n={createI18n()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { bodies, user: userEvent.setup() }
}

async function fillIn(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(await screen.findByLabelText(/Work email/, {}, { timeout: 5000 }), email)
  await user.type(screen.getByLabelText(/Your name/), 'Ada Lovelace')
  await user.type(screen.getByLabelText(/Organization name/), 'Analytical')
  await user.click(screen.getByRole('button', { name: 'Send me the link' }))
}

// Typing a form one key at a time into a lazily loaded page is slow on a busy
// machine; the default five seconds is not a statement about this page.
describe('SignupPage', { timeout: 20_000 }, () => {
  it('sends the link and says so, creating nothing yet', async () => {
    const { bodies, user } = renderSignup()
    await fillIn(user, 'ada@analytical.example')
    expect(await screen.findByText(/a link is on its way/)).toBeTruthy()
    expect(bodies).toEqual([
      expect.objectContaining({ email: 'ada@analytical.example', org_name: 'Analytical' }),
    ])
  })

  it('points someone at a claimed domain to their existing organization', async () => {
    const { user } = renderSignup()
    await fillIn(user, 'bob@claimed.example')
    expect(await screen.findByText(/already claimed your email’s domain/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toBeTruthy()
  })
})
