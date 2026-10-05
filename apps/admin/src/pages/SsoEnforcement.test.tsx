// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'

import { SsoEnforcement } from './SsoEnforcement'

const state = vi.hoisted(() => ({ org: null as unknown }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: () => true } }),
}))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const ACTIVE = {
  org_id: 'org-1',
  protocol: 'oidc' as const,
  preset: 'generic',
  issuer: 'https://idp.example.test',
  client_id: 'client-1',
  client_secret_set: true,
  scopes: ['openid'],
  email_claim: 'email',
  name_claim: 'name',
  require_email_verified: false,
  status: 'active' as const,
  verified_at: '2026-10-01T09:00:00Z',
  redirect_uri: 'https://api.test/identity/v1/sign-in/callback',
  sso_enforced: false,
  sso_enforcement_active: false,
}
type Provider =
  | typeof ACTIVE
  | (Omit<typeof ACTIVE, 'status' | 'verified_at'> & {
      status: 'active' | 'pending_first_sign_in' | 'disabled'
      verified_at?: string
    })

function setup(
  provider: Provider,
  {
    role = 'owner',
    put = () => json({ ...provider, sso_enforced: true, sso_enforcement_active: true }),
  } = {},
) {
  const sent: { path: string; body: unknown }[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    if (path.endsWith('/domain')) return json({ domain: 'acme.test', verified: true })
    if (path.endsWith('/identity-provider/enforcement')) {
      sent.push({ path, body: JSON.parse(await input.text()) })
      return put()
    }
    return new Response(null, { status: 404 })
  }
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role,
  }
  const onChange = vi.fn()
  function Harness() {
    return <SsoEnforcement provider={provider as never} onChange={onChange} />
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <Harness />
    </I18nextProvider>,
  )
  return { sent, onChange, user: userEvent.setup() }
}

const toggle = () =>
  screen.findByRole('checkbox', { name: /Require single sign-on for/ }, { timeout: 5000 })

describe('SsoEnforcement', () => {
  it('lets an Owner require a verified provider for the domain, after asking', async () => {
    const { user, sent, onChange } = setup(ACTIVE)
    expect(await screen.findByLabelText('Require single sign-on for acme.test')).toBeTruthy()
    // Break glass is explained.
    expect(screen.getByText(/Owners who have already set up two-step sign-in/)).toBeTruthy()

    await user.click(await toggle())
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Require single sign-on for acme.test?')).toBeTruthy()
    expect(sent).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Require single sign-on' }))

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(sent).toEqual([
      {
        path: '/identity/v1/organizations/org-1/identity-provider/enforcement',
        body: { enforced: true },
      },
    ])
    expect(onChange.mock.calls[0]![0]).toMatchObject({ sso_enforced: true })
  })

  it('is the Owner’s alone: anyone else sees it switched off, with why', async () => {
    setup(ACTIVE, { role: 'admin' })
    expect(await toggle()).toHaveProperty('disabled', true)
    expect(screen.getByText('Only an Owner can change this.')).toBeTruthy()
  })

  it('waits for a provider that is not verified yet', async () => {
    const pending = { ...ACTIVE, status: 'pending_first_sign_in' as const, verified_at: undefined }
    setup(pending)
    expect(await toggle()).toHaveProperty('disabled', true)
    expect(screen.getByText(/Available once the provider is active and confirmed/)).toBeTruthy()
  })

  it('says why when the server finds the provider not verified (409)', async () => {
    const { user, onChange } = setup(ACTIVE, {
      put: () => json({ code: 'identity_provider.not_verified', message: 'Not verified.' }, 409),
    })
    await user.click(await toggle())
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Require single sign-on',
      }),
    )
    expect(await screen.findByText(/The identity provider is not confirmed yet/)).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows a requirement that waits for the provider, and lets the Owner turn it off', async () => {
    const waiting = {
      ...ACTIVE,
      status: 'pending_first_sign_in' as const,
      verified_at: undefined,
      sso_enforced: true,
    }
    const { user, sent } = setup(waiting, { put: () => json({ ...waiting, sso_enforced: false }) })
    expect(await screen.findByText(/Required, but not in force/)).toBeTruthy()
    const control = await toggle()
    expect(control).toHaveProperty('disabled', false)
    await user.click(control)
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Stop requiring it' }),
    )
    await vi.waitFor(() => expect(sent[0]?.body).toEqual({ enforced: false }))
  })
})
