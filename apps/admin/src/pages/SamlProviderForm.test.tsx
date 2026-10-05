// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdentityProviderSettings } from './IdentityProviderSettings'
import { certificateState, samlBodyOf, samlBlank } from './SamlProviderForm'

const state = vi.hoisted(() => ({ org: null as unknown, role: 'owner' }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => state.org,
  useSession: () => ({ permissions: { can: (p: string) => p === 'sso' || p === 'settings' } }),
}))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const DAY = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()

const PRESETS = [
  {
    preset: 'generic',
    protocol: 'oidc',
    issuer: '',
    scopes: ['openid', 'email', 'profile'],
    email_claim: 'email',
    name_claim: 'name',
    require_email_verified: false,
    fields: ['issuer'],
  },
  {
    preset: 'saml',
    protocol: 'saml',
    issuer: '',
    scopes: [],
    email_claim: '',
    name_claim: '',
    require_email_verified: false,
    fields: ['metadata_url', 'metadata_xml', 'profile'],
  },
]

const ENTRA_CLAIMS = 'http://schemas.example.test/claims'
const PROFILES = [
  {
    profile: 'okta',
    label: 'Okta',
    email_attribute: 'email',
    name_attribute: 'name',
    given_name_attribute: 'firstName',
    family_name_attribute: 'lastName',
  },
  {
    profile: 'entra',
    label: 'Microsoft Entra ID',
    email_attribute: `${ENTRA_CLAIMS}/emailaddress`,
    name_attribute: `${ENTRA_CLAIMS}/displayname`,
    given_name_attribute: `${ENTRA_CLAIMS}/givenname`,
    family_name_attribute: `${ENTRA_CLAIMS}/surname`,
  },
  {
    profile: 'generic',
    label: 'Another SAML provider',
    email_attribute: 'email',
    name_attribute: 'name',
    given_name_attribute: 'firstName',
    family_name_attribute: 'lastName',
  },
]

const SP = {
  entity_id: 'https://api.test/identity/v1/sign-in/saml/org-1/metadata',
  acs_url: 'https://api.test/identity/v1/sign-in/saml/org-1/acs',
  metadata_url: 'https://api.test/identity/v1/sign-in/saml/org-1/metadata',
  name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
}

// Obviously fake fingerprints: nothing here is a real certificate.
const savedSaml = (patch: Record<string, unknown> = {}) => ({
  org_id: 'org-1',
  protocol: 'saml',
  preset: 'saml',
  issuer: 'https://idp.example.test/entity',
  client_id: SP.entity_id,
  client_secret_set: false,
  scopes: [],
  email_claim: 'email',
  name_claim: 'name',
  require_email_verified: false,
  status: 'pending_first_sign_in',
  redirect_uri: SP.acs_url,
  sso_enforced: false,
  sso_enforcement_active: false,
  saml: {
    entity_id: 'https://idp.example.test/entity',
    sso_url: 'https://idp.example.test/sso',
    metadata_url: 'https://idp.example.test/metadata',
    profile: 'okta',
    email_attribute: 'email',
    name_attribute: 'name',
    given_name_attribute: 'firstName',
    family_name_attribute: 'lastName',
    certificates: [
      {
        subject: 'CN=fake-signing-a',
        not_before: '2026-01-01T00:00:00Z',
        not_after: inDays(400),
        sha256: 'AA:AA:AA',
      },
    ],
    certificates_expire_at: inDays(400),
    service_provider: SP,
  },
  ...patch,
})

const PASSING = {
  ok: true,
  issuer: 'https://idp.example.test/entity',
  redirect_uri: SP.acs_url,
  checks: [
    { check: 'metadata', ok: true, message: 'The metadata was read.' },
    {
      check: 'entity_id',
      ok: true,
      message: 'The identity provider is https://idp.example.test/entity.',
    },
    {
      check: 'sso_url',
      ok: true,
      message: 'People are sent to https://idp.example.test/sso to sign in.',
    },
    {
      check: 'certificates',
      ok: true,
      message:
        '1 signing certificate(s); the last expires on 1 November 2026. Renew it soon: sign-in stops when it expires.',
    },
  ],
}

interface Setup {
  saved?: Record<string, unknown>
  test?: () => Response
  put?: () => Response
}

function setup({ saved, test = () => json(PASSING), put = () => json(savedSaml()) }: Setup = {}) {
  const sent: { method: string; path: string; body: Record<string, unknown> | null }[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    const text = input.method === 'GET' ? '' : await input.text()
    sent.push({ method: input.method, path, body: text ? JSON.parse(text) : null })
    if (path.endsWith('/v1/identity-provider-presets'))
      return json({ presets: PRESETS, saml_profiles: PROFILES })
    if (path.endsWith('/identity-provider/saml-service-provider')) return json(SP)
    if (path.endsWith('/identity-provider/test')) return test()
    if (path.endsWith('/domain')) return json({ domain: 'acme.test', verified: true })
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
    role: state.role,
  }
  const user = userEvent.setup()
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter initialEntries={['/sso']}>
        <IdentityProviderSettings />
      </MemoryRouter>
    </I18nextProvider>,
  )
  return { sent, user }
}

const buttons = () => ({
  test: screen.getByRole('button', { name: 'Test connection' }),
  save: screen.getByRole('button', { name: 'Save provider' }),
})

async function pickSaml(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(
    await screen.findByLabelText(/Identity provider/, {}, { timeout: 5000 }),
    'saml',
  )
}

const value = (label: RegExp) => (screen.getByLabelText(label) as HTMLInputElement).value

describe('SAML identity provider', () => {
  beforeEach(() => {
    state.role = 'owner'
  })

  it('shows what to set up at the provider first, each with a copy button', async () => {
    const { user } = setup()
    await pickSaml(user)
    expect(await screen.findByText(SP.acs_url)).toBeTruthy()
    expect(screen.getByText(SP.name_id_format)).toBeTruthy()
    // Before any metadata is asked for.
    const details = screen.getByText(/First, set up this service/)
    const metadata = screen.getByText('Identity provider metadata')
    expect(
      details.compareDocumentPosition(metadata) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Copy ACS URL (reply URL)' }))
    expect(await navigator.clipboard.readText()).toBe(SP.acs_url)
    await user.click(screen.getByRole('button', { name: 'Copy Entity ID (audience)' }))
    expect(await navigator.clipboard.readText()).toBe(SP.entity_id)
    expect(screen.getByRole('button', { name: 'Copy Our metadata URL' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy NameID format' })).toBeTruthy()
  })

  it('fills the attribute mapping in from the profile, and keeps it editable', async () => {
    const { user, sent } = setup()
    await pickSaml(user)
    const profile = await screen.findByLabelText(/Your provider/)
    // The generic profile to start with.
    expect((profile as HTMLSelectElement).value).toBe('generic')
    expect(value(/Given name attribute/)).toBe('firstName')

    await user.selectOptions(profile, 'entra')
    expect(value(/Email attribute/)).toBe(`${ENTRA_CLAIMS}/emailaddress`)
    expect(value(/Family name attribute/)).toBe(`${ENTRA_CLAIMS}/surname`)

    await user.clear(screen.getByLabelText(/Given name attribute/))
    await user.type(screen.getByLabelText(/Given name attribute/), 'given')
    await user.type(screen.getByLabelText(/Metadata URL/), 'https://idp.example.test/metadata')
    await user.click(buttons().test)
    await screen.findByText(/Every check passed/)
    const test = sent.find((r) => r.path.endsWith('/identity-provider/test'))
    expect(test?.body).toEqual({
      preset: 'saml',
      saml: {
        metadata_url: 'https://idp.example.test/metadata',
        profile: 'entra',
        email_attribute: `${ENTRA_CLAIMS}/emailaddress`,
        name_attribute: `${ENTRA_CLAIMS}/displayname`,
        given_name_attribute: 'given',
        family_name_attribute: `${ENTRA_CLAIMS}/surname`,
      },
    })
  })

  it('shows every check with the certificate warning, and saves only after a passing test', async () => {
    const { user, sent } = setup()
    await pickSaml(user)
    expect(buttons().test).toHaveProperty('disabled', true)
    await user.type(
      await screen.findByLabelText(/Metadata URL/),
      'https://idp.example.test/metadata',
    )
    expect(buttons().save).toHaveProperty('disabled', true)
    await user.click(buttons().test)

    const list = await screen.findByRole('list', { name: 'Test connection' })
    const items = within(list).getAllByRole('listitem')
    expect(
      items.map(
        (li) =>
          within(li).getByText(/Metadata|Entity ID|Single sign-on URL|Signing certificates/)
            .textContent,
      ),
    ).toEqual(['Metadata', 'Entity ID', 'Single sign-on URL', 'Signing certificates'])
    expect(within(items[3]!).getByText(/Renew it soon/)).toBeTruthy()
    expect(buttons().save).toHaveProperty('disabled', false)

    // A change after the test needs another one.
    await user.type(screen.getByLabelText(/Name attribute/, { selector: 'input' }), 'x')
    expect(buttons().save).toHaveProperty('disabled', true)
    await user.clear(screen.getByLabelText(/^Name attribute/))
    await user.type(screen.getByLabelText(/^Name attribute/), 'name')
    expect(buttons().save).toHaveProperty('disabled', false)

    await user.click(buttons().save)
    await screen.findByText('People sign in through a SAML 2.0 identity provider.')
    expect(sent.filter((r) => r.method === 'PUT')).toHaveLength(1)
    expect(sent.find((r) => r.method === 'PUT')?.body?.preset).toBe('saml')
    // Saved, it waits for its first sign-in.
    expect(screen.getAllByText(/Waiting for the first sign-in to confirm/).length).toBeGreaterThan(
      0,
    )
  })

  it('reads the metadata from a file, and puts a failed check on the input it names', async () => {
    const failing = {
      ok: false,
      redirect_uri: SP.acs_url,
      checks: [
        { check: 'metadata', ok: true, message: 'The uploaded metadata was read.' },
        {
          check: 'entity_id',
          ok: false,
          field: 'saml.metadata_xml',
          message: 'This is this service’s own metadata; upload the identity provider’s.',
        },
      ],
    }
    const { user, sent } = setup({ test: () => json(failing) })
    await pickSaml(user)
    await user.click(await screen.findByLabelText('Upload or paste the XML'))
    const xml = '<EntityDescriptor entityID="https://idp.example.test/entity"/>'
    await user.upload(
      screen.getByTestId('saml-metadata-file'),
      new File([xml], 'metadata.xml', { type: 'application/xml' }),
    )
    await vi.waitFor(() => expect(value(/Metadata XML/)).toBe(xml))
    await user.click(buttons().test)

    await screen.findByRole('list', { name: 'Test connection' })
    expect(screen.getByLabelText(/Metadata XML/).getAttribute('aria-invalid')).toBe('true')
    expect(buttons().save).toHaveProperty('disabled', true)
    const test = sent.find((r) => r.path.endsWith('/identity-provider/test'))
    expect((test?.body?.saml as Record<string, unknown>).metadata_xml).toBe(xml)
    expect((test?.body?.saml as Record<string, unknown>).metadata_url).toBeUndefined()
  })

  it('refuses a metadata file over 1 MB before sending it', async () => {
    const { user } = setup()
    await pickSaml(user)
    await user.click(await screen.findByLabelText('Upload or paste the XML'))
    await user.upload(
      screen.getByTestId('saml-metadata-file'),
      new File(['x'.repeat(1024 * 1024 + 1)], 'big.xml', { type: 'application/xml' }),
    )
    expect(await screen.findByText('That file is larger than 1 MB.')).toBeTruthy()
    expect(value(/Metadata XML/)).toBe('')
  })

  it('shows a saved provider waiting for its first sign-in, its certificates and their ends', async () => {
    const saved = savedSaml({
      saml: {
        ...savedSaml().saml,
        metadata_url: undefined,
        certificates: [
          {
            subject: 'CN=fake-signing-a',
            not_before: '2026-01-01T00:00:00Z',
            not_after: inDays(10),
            sha256: 'AA:AA:AA',
          },
          {
            subject: 'CN=fake-signing-b',
            not_before: '2025-01-01T00:00:00Z',
            not_after: inDays(-1),
            sha256: 'BB:BB:BB',
          },
        ],
        certificates_expire_at: inDays(10),
      },
    })
    const { user, sent } = setup({ saved })
    expect(
      await screen.findByText('Waiting for the first sign-in to confirm', {}, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText(/The provider’s last signing certificate expires on/)).toBeTruthy()
    expect(screen.getAllByText('AA:AA:AA').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Expires soon').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0)
    expect(screen.getByText('Metadata uploaded.')).toBeTruthy()

    // The uploaded metadata is kept: a test without any sends none.
    expect(screen.getByLabelText(/Metadata XML/)).toBeTruthy()
    await user.click(buttons().test)
    await screen.findByRole('list', { name: 'Test connection' })
    const test = sent.find((r) => r.path.endsWith('/identity-provider/test'))
    expect(test?.body?.saml).not.toHaveProperty('metadata_xml')
    expect(test?.body?.saml).not.toHaveProperty('metadata_url')
  })
})

describe('the SAML helpers', () => {
  it('flags a certificate within 30 days of its end, and one past it', () => {
    const now = Date.parse('2026-10-05T00:00:00Z')
    expect(certificateState('2027-10-05T00:00:00Z', now)).toBe('valid')
    expect(certificateState('2026-10-20T00:00:00Z', now)).toBe('soon')
    expect(certificateState('2026-10-01T00:00:00Z', now)).toBe('expired')
  })

  it('sends only the metadata source picked', () => {
    const form = { ...samlBlank(), metadata_url: 'https://a.example.test', metadata_xml: '<x/>' }
    expect(samlBodyOf(form).saml).toHaveProperty('metadata_url')
    expect(samlBodyOf(form).saml).not.toHaveProperty('metadata_xml')
    expect(samlBodyOf({ ...form, source: 'xml' }).saml).toHaveProperty('metadata_xml', '<x/>')
  })
})
