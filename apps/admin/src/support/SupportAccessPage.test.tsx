// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Toaster } from '@unityevolv/unitykit'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import SupportAccessPage from './SupportAccessPage'
import { grantState, memberName, validDuration } from './support'

const org = vi.hoisted(() => ({ current: null as unknown, readOnly: false }))
vi.mock('@b2b-template/ui-web', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useOrg: () => org.current,
  useReadOnly: () => org.readOnly,
}))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const FUTURE = '2099-01-01T12:00:00Z'

interface Call {
  method: string
  path: string
  body?: unknown
}

function renderPage(role: string, { readOnly = false } = {}) {
  const calls: Call[] = []
  let standing = { org_id: 'org-1', standing: false, include_owners: false }
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    const text = ['POST', 'PUT'].includes(input.method) ? await input.text() : ''
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : undefined
    calls.push({ method: input.method, path, ...(body ? { body } : {}) })
    const base = '/identity/v1/organizations/org-1'
    if (path === `${base}/support-access`) {
      if (input.method === 'PUT') standing = { ...standing, ...(body as typeof standing) }
      return json(standing)
    }
    if (path === `${base}/impersonation-grants` && input.method === 'POST') {
      return json(
        {
          id: 'g-new',
          org_id: 'org-1',
          granted_by: 'membership:m-1',
          created_at: '2026-10-05T12:00:00Z',
          expires_at: FUTURE,
          include_owners: body?.include_owners ?? false,
          active: true,
        },
        201,
      )
    }
    if (path === `${base}/impersonation-grants`) {
      return json({
        grants: [
          {
            id: 'g-1',
            org_id: 'org-1',
            granted_by: 'membership:m-1',
            created_at: '2026-10-05T11:00:00Z',
            expires_at: FUTURE,
            include_owners: false,
            active: true,
          },
        ],
      })
    }
    if (path === `${base}/impersonations`) {
      return json({
        impersonations: [
          {
            id: 'i-1',
            org_id: 'org-1',
            grant_id: 'g-1',
            impersonator_id: 'op-7',
            user_id: 'u-2',
            membership_id: 'm-2',
            started_at: '2026-10-05T11:30:00Z',
            ends_at: FUTURE,
            active: true,
          },
        ],
      })
    }
    if (input.method === 'DELETE') return new Response(null, { status: 204 })
    if (path === '/user/v1/organizations/org-1/memberships') {
      return json({
        memberships: [
          { id: 'm-1', user: { id: 'u-1', name: 'Olu Owner' }, role: 'owner' },
          { id: 'm-2', user: { id: 'u-2', name: 'Ada Admin' }, role: 'admin' },
        ],
      })
    }
    return new Response(null, { status: 404 })
  }
  org.readOnly = readOnly
  org.current = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: role === 'owner' ? 'm-1' : 'm-2',
    role,
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter>
        <SupportAccessPage />
      </MemoryRouter>
      <Toaster />
    </I18nextProvider>,
  )
  return calls
}

describe('support access, for an Owner', () => {
  it('gives a time-boxed consent, Owners included when asked', async () => {
    const calls = renderPage('owner')
    const duration = await screen.findByLabelText('For')
    expect(
      within(duration)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      '15 minutes',
      '30 minutes',
      '1 hour',
      '2 hours',
      '4 hours',
      '8 hours',
      '12 hours',
      '24 hours',
    ])
    fireEvent.change(duration, { target: { value: '240' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Owners included in this consent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Give consent' }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        path: '/identity/v1/organizations/org-1/impersonation-grants',
        body: { duration_minutes: 240, include_owners: true },
      }),
    )
  })

  it('lists consents by who gave them, and withdraws one', async () => {
    const calls = renderPage('owner')
    const consents = within(await screen.findByRole('table', { name: 'Consents' }))
    expect(consents.getByText('Olu Owner')).toBeTruthy()
    expect(consents.getByText('Not included')).toBeTruthy()
    fireEvent.click(consents.getByRole('button', { name: /^Withdraw the consent open until/ }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: '/identity/v1/organizations/org-1/impersonation-grants/g-1',
      }),
    )
  })

  it('turns standing access on, then includes Owners', async () => {
    const calls = renderPage('owner')
    const standing = await screen.findByRole('checkbox', { name: 'Allow standing support access' })
    const owners = screen.getByRole('checkbox', { name: 'Include Owners' })
    // Owners are a choice within standing access, not without it.
    expect(owners).toHaveProperty('disabled', true)
    fireEvent.click(standing)
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        path: '/identity/v1/organizations/org-1/support-access',
        body: { standing: true, include_owners: false },
      }),
    )
    await waitFor(() => expect(owners).toHaveProperty('disabled', false))
    fireEvent.click(owners)
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        path: '/identity/v1/organizations/org-1/support-access',
        body: { standing: true, include_owners: true },
      }),
    )
  })

  it('lists support sessions, and ends an active one now', async () => {
    const calls = renderPage('owner')
    const sessions = within(await screen.findByRole('table', { name: 'Support sessions' }))
    expect(sessions.getByText('Ada Admin')).toBeTruthy()
    fireEvent.click(
      sessions.getByRole('button', { name: 'End the support session as Ada Admin now' }),
    )
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: '/identity/v1/organizations/org-1/impersonations/i-1',
      }),
    )
  })
})

describe('support access, for an Admin', () => {
  it('shows everything and changes nothing', async () => {
    const calls = renderPage('admin')
    expect(
      await screen.findByText(
        'Only an Owner can give consent, change standing access or end a support session.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Allow standing support access' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.queryByRole('button', { name: 'Give consent' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Withdraw/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^End the support session/ })).toBeNull()
    expect(screen.getByRole('table', { name: 'Consents' }).textContent).toContain('Olu Owner')
    expect(calls.every((c) => c.method === 'GET')).toBe(true)
  })
})

describe('support access, in a support session as an Owner', () => {
  it('changes nothing either', async () => {
    renderPage('owner', { readOnly: true })
    expect(
      await screen.findByRole('checkbox', { name: 'Allow standing support access' }),
    ).toHaveProperty('disabled', true)
    expect(screen.queryByRole('button', { name: 'Give consent' })).toBeNull()
  })
})

describe('support access rules', () => {
  it('accepts 15 minutes to 24 hours', () => {
    expect(validDuration(14)).toBe(false)
    expect(validDuration(15)).toBe(true)
    expect(validDuration(1440)).toBe(true)
    expect(validDuration(1441)).toBe(false)
    expect(validDuration(30.5)).toBe(false)
  })

  it('tells an open consent from a withdrawn or ended one', () => {
    const grant = {
      id: 'g',
      org_id: 'o',
      granted_by: 'membership:m',
      created_at: '2026-10-05T00:00:00Z',
      expires_at: '2026-10-05T12:00:00Z',
      include_owners: false,
      active: true,
    }
    const now = Date.parse('2026-10-05T11:00:00Z')
    expect(grantState(grant, now)).toBe('open')
    expect(grantState({ ...grant, revoked_at: '2026-10-05T10:00:00Z', active: false }, now)).toBe(
      'withdrawn',
    )
    expect(grantState(grant, Date.parse('2026-10-05T12:00:00Z'))).toBe('ended')
  })

  it('names who gave a consent, by membership or user id', () => {
    const members = [{ id: 'm-1', user: { id: 'u-1', name: 'Olu' } }] as never
    expect(memberName(members, 'membership:m-1')).toBe('Olu')
    expect(memberName(members, 'u-1')).toBe('Olu')
    expect(memberName(members, 'membership:m-9')).toBe('membership:m-9')
  })
})
