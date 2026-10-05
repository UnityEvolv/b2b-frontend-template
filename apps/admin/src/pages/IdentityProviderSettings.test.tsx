// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdentityProviderSettings } from './IdentityProviderSettings'

const state = vi.hoisted(() => ({ org: null as unknown, sso: true }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: (p: string) => p === 'sso' && state.sso } }),
}))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const PRESETS = [
  {
    preset: 'entra',
    issuer: 'https://login.example/{tenant_id}/v2.0',
    scopes: ['openid', 'profile', 'email'],
    email_claim: 'email',
    name_claim: 'name',
    require_email_verified: false,
    fields: ['tenant_id'],
  },
  {
    preset: 'generic',
    issuer: '',
    scopes: ['openid', 'email', 'profile'],
    email_claim: 'email',
    name_claim: 'name',
    require_email_verified: false,
    fields: ['issuer'],
  },
  // A preset this page has never heard of still renders, from what the API says it asks for.
  {
    preset: 'acme',
    issuer: 'https://id.acme.example',
    scopes: ['openid'],
    email_claim: 'mail',
    name_claim: 'cn',
    require_email_verified: true,
    fields: ['hosted_domain'],
  },
]

const SAVED = {
  org_id: 'org-1',
  preset: 'generic',
  issuer: 'https://idp.example.com',
  client_id: 'client-1',
  client_secret_set: true,
  scopes: ['openid', 'email', 'profile'],
  email_claim: 'email',
  name_claim: 'name',
  require_email_verified: false,
  status: 'active',
  verified_at: '2026-10-01T09:00:00Z',
  redirect_uri: 'https://api.test/identity/v1/sign-in/callback',
}

const PASSING = {
  ok: true,
  issuer: 'https://idp.example.com',
  redirect_uri: 'https://api.test/identity/v1/sign-in/callback',
  checks: [
    { check: 'discovery', ok: true, message: 'The discovery document was read.' },
    { check: 'issuer', ok: true, message: 'The issuer is https://idp.example.com.' },
    { check: 'keys', ok: true, message: 'The provider publishes 2 signing key(s).' },
    { check: 'client', ok: true, message: 'The provider accepted the client.' },
  ],
}

interface Setup {
  saved?: typeof SAVED
  test?: () => Response
  put?: () => Response
}

function setup({ saved, test = () => json(PASSING), put = () => json(SAVED) }: Setup = {}) {
  const sent: { method: string; path: string; body: Record<string, unknown> | null }[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    const text = input.method === 'GET' ? '' : await input.text()
    sent.push({ method: input.method, path, body: text ? JSON.parse(text) : null })
    if (path.endsWith('/v1/identity-provider-presets')) return json({ presets: PRESETS })
    if (path.endsWith('/identity-provider/test')) return test()
    if (path.endsWith('/identity-provider') && input.method === 'PUT') return put()
    if (path.endsWith('/identity-provider')) {
      return saved
        ? json(saved)
        : json({ code: 'identity_provider.not_configured', message: 'None.' }, 404)
    }
    return new Response(null, { status: 404 })
  }
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role: 'owner',
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter initialEntries={['/sso']}>
        <IdentityProviderSettings />
      </MemoryRouter>
    </I18nextProvider>,
  )
  return { sent, user: userEvent.setup() }
}

const buttons = () => ({
  test: screen.getByRole('button', { name: 'Test connection' }),
  save: screen.getByRole('button', { name: 'Save provider' }),
})

async function fillGeneric(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(
    await screen.findByLabelText(/Identity provider/, {}, { timeout: 5000 }),
    'generic',
  )
  await user.type(screen.getByLabelText(/Issuer URL/), 'https://idp.example.com')
  await user.type(screen.getByLabelText(/Client ID/), 'client-1')
  await user.type(screen.getByLabelText(/Client secret/), 's3cret')
}

describe('IdentityProviderSettings', () => {
  beforeEach(() => {
    state.sso = true
  })

  it('renders each preset’s inputs from the API, an unknown one’s too', async () => {
    const { user } = setup()
    const picker = await screen.findByLabelText(/Identity provider/, {}, { timeout: 5000 })
    expect(
      within(picker)
        .getAllByRole('option')
        .map((o) => o.getAttribute('value')),
    ).toEqual(['', 'entra', 'generic', 'acme'])
    // The first preset is picked to start with, and asks for its tenant.
    expect(screen.getByLabelText(/Tenant ID or verified domain/)).toBeTruthy()
    expect(screen.queryByLabelText(/Issuer URL/)).toBeNull()

    await user.selectOptions(picker, 'generic')
    expect(screen.getByLabelText(/Issuer URL/)).toBeTruthy()
    expect(screen.queryByLabelText(/Tenant ID/)).toBeNull()

    await user.selectOptions(picker, 'acme')
    expect(screen.getByLabelText(/Workspace domain/)).toBeTruthy()
    // Its scopes and claims come from the preset too.
    expect((screen.getByLabelText(/Email claim/) as HTMLInputElement).value).toBe('mail')
    expect((screen.getByLabelText(/Scopes/) as HTMLInputElement).value).toBe('openid')
  })

  it('shows every check of a test, and the redirect URI to register', async () => {
    const failing = {
      ...PASSING,
      ok: false,
      checks: [
        PASSING.checks[0],
        {
          check: 'client',
          ok: false,
          field: 'client_secret',
          message: 'The provider refused the client id and secret.',
        },
      ],
    }
    const { user, sent } = setup({ test: () => json(failing) })
    await fillGeneric(user)
    await user.click(buttons().test)

    const list = await screen.findByRole('list', { name: 'Test connection' })
    const [discovery, client] = within(list).getAllByRole('listitem')
    expect(within(discovery!).getByText('Passed')).toBeTruthy()
    expect(within(discovery!).getByText('The discovery document was read.')).toBeTruthy()
    expect(within(client!).getByText('Failed')).toBeTruthy()
    expect(within(client!).getByText('Client ID and secret')).toBeTruthy()
    // The failed check's message is on the input it names.
    expect(screen.getByLabelText(/Client secret/).getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(PASSING.redirect_uri)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(buttons().save).toHaveProperty('disabled', true)

    const test = sent.find((r) => r.path.endsWith('/identity-provider/test'))
    expect(test?.body).toEqual({
      preset: 'generic',
      issuer: 'https://idp.example.com',
      client_id: 'client-1',
      client_secret: 's3cret',
      scopes: ['openid', 'email', 'profile'],
      email_claim: 'email',
      name_claim: 'name',
      require_email_verified: false,
    })
  })

  it('offers Save only after a passing test of the values as they are now', async () => {
    const { user, sent } = setup()
    await fillGeneric(user)
    expect(buttons().save).toHaveProperty('disabled', true)

    await user.click(buttons().test)
    await screen.findByText(/Every check passed/)
    expect(buttons().save).toHaveProperty('disabled', false)

    // A change after the test needs another one.
    await user.type(screen.getByLabelText(/Client ID/), 'x')
    expect(buttons().save).toHaveProperty('disabled', true)
    await user.click(buttons().test)
    await screen.findByText(/Every check passed/)
    await user.click(buttons().save)
    await screen.findByText(/People sign in through/)
    expect(sent.filter((r) => r.method === 'PUT')).toHaveLength(1)
    expect(sent.find((r) => r.method === 'PUT')?.body?.client_id).toBe('client-1x')
  })

  it('asks for the secret again when the provider or client id changes', async () => {
    const { user } = setup({ saved: SAVED })
    const secret = await screen.findByLabelText(/Client secret/, {}, { timeout: 5000 })
    // The same provider keeps the saved secret.
    expect(screen.getByText('Leave empty to keep the saved secret.')).toBeTruthy()
    expect(buttons().test).toHaveProperty('disabled', false)

    await user.type(screen.getByLabelText(/Client ID/), '-new')
    expect(screen.getByText(/Enter the client secret again/)).toBeTruthy()
    expect(buttons().test).toHaveProperty('disabled', true)
    await user.type(secret, 'another')
    expect(buttons().test).toHaveProperty('disabled', false)

    await user.clear(screen.getByLabelText(/Client ID/))
    await user.type(screen.getByLabelText(/Client ID/), 'client-1')
    await user.clear(secret)
    expect(buttons().test).toHaveProperty('disabled', false)
    await user.type(screen.getByLabelText(/Issuer URL/), '/other')
    expect(buttons().test).toHaveProperty('disabled', true)
  })

  it('puts a failed save’s messages on the inputs they name', async () => {
    const { user } = setup({
      put: () =>
        json(
          {
            code: 'identity_provider.test_failed',
            message: 'The discovery document could not be read.',
            fields: { issuer: 'The discovery document could not be read.' },
          },
          422,
        ),
    })
    await fillGeneric(user)
    await user.click(buttons().test)
    await screen.findByText(/Every check passed/)
    await user.click(buttons().save)

    await vi.waitFor(() =>
      expect(screen.getByLabelText(/Issuer URL/).getAttribute('aria-invalid')).toBe('true'),
    )
    expect(screen.getAllByText('The discovery document could not be read.').length).toBeGreaterThan(
      0,
    )
    // The server's test failed, so Save waits for another passing test.
    expect(buttons().save).toHaveProperty('disabled', true)
  })

  it('shows nothing without the sso permission', async () => {
    state.sso = false
    const { sent } = setup()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText('Sign-in')).toBeNull()
    expect(sent).toHaveLength(0)
  })
})
