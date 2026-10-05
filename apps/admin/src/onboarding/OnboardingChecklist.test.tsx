// @vitest-environment jsdom
import { createApi } from '@b2b-template/api'
import { createI18n } from '@b2b-template/i18n'
import type * as UiWeb from '@b2b-template/ui-web'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Toaster } from '@unityevolv/unitykit'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { OnboardingChecklist, OnboardingRestore } from './OnboardingChecklist'
import { showChecklist, splitSteps, stepState, type Onboarding } from './onboarding'
import { SetupHint } from './SetupHint'

const state = vi.hoisted(() => ({
  org: null as unknown,
  granted: ['settings'] as string[],
  readOnly: false,
  origins: {} as Record<string, string>,
}))
vi.mock('@b2b-template/ui-web', async (original) => {
  const real = await original<typeof UiWeb>()
  return {
    ...real,
    useOrg: () => state.org,
    useSession: () => ({ permissions: { can: (p: string) => state.granted.includes(p) } }),
    useReadOnly: () => state.readOnly,
    // The real resolution, from the admin app with this build's origins.
    useAppLink: (app: string, href: string) => real.appLink(app, href, 'admin', state.origins),
  }
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const step = (id: string, fields: Partial<Onboarding['steps'][number]> = {}) => ({
  id,
  label: id,
  href: `/${id}`,
  app: 'admin',
  done: false,
  dismissed: false,
  unknown: false,
  ...fields,
})

const CHECKLIST: Onboarding = {
  org_id: 'org-1',
  dismissed: false,
  complete: false,
  steps: [
    step('verify_domain', { label: 'Verify your domain', href: '/settings', done: true }),
    step('invite_teammates', { label: 'Invite your teammates', href: '/users/invite' }),
    step('set_up_sso', { label: 'Set up single sign-on', href: '/sso', dismissed: true }),
    step('choose_plan', { label: 'Choose a plan', href: '/billing' }),
    step('create_project', {
      label: 'Create your first project',
      href: '/projects/new',
      app: 'projects',
      unknown: true,
    }),
    step('connect_reports', {
      label: 'Connect your reports',
      href: '/reports/connect',
      app: 'reports',
    }),
  ],
}

interface Call {
  method: string
  path: string
}

function renderChecklist(
  checklist: Onboarding | null = CHECKLIST,
  options: {
    granted?: string[]
    readOnly?: boolean
    origins?: Record<string, string>
    restore?: boolean
  } = {},
) {
  const calls: Call[] = []
  const fetch = async (input: Request) => {
    const path = new URL(input.url).pathname
    calls.push({ method: input.method, path })
    if (input.method === 'GET' && path.endsWith('/onboarding')) {
      return checklist ? json(checklist) : json({ code: 'forbidden', message: 'No.' }, 403)
    }
    return new Response(null, { status: 204 })
  }
  state.granted = options.granted ?? ['settings']
  state.readOnly = options.readOnly ?? false
  state.origins = options.origins ?? { projects: 'https://projects.example.test' }
  state.org = {
    api: createApi({ baseUrl: (s) => `https://api.test/${s}`, getToken: () => 't', fetch }),
    orgId: 'org-1',
    membershipId: 'm-1',
    role: 'owner',
  }
  render(
    <I18nextProvider i18n={createI18n()}>
      <MemoryRouter initialEntries={['/users']}>
        {options.restore ? <OnboardingRestore /> : <OnboardingChecklist />}
      </MemoryRouter>
      <Toaster />
    </I18nextProvider>,
  )
  return calls
}

const BASE = '/organization/v1/organizations/org-1/onboarding'
const steps = async () => within(await screen.findByRole('list', { name: 'Setup steps' }))
const item = (list: ReturnType<typeof within>, label: string) =>
  list.getByText(label).closest('li') as HTMLElement

describe('the setup checklist', () => {
  it('shows each step not hidden, done, not yet or unknown', async () => {
    renderChecklist()
    const list = await steps()
    expect(within(item(list, 'Verify your domain')).getByText('Done')).toBeTruthy()
    expect(within(item(list, 'Invite your teammates')).getByText('Not yet')).toBeTruthy()
    expect(
      within(item(list, 'Create your first project')).getByText('Could not check'),
    ).toBeTruthy()
    // A hidden step is not in the list.
    expect(list.queryByText('Set up single sign-on')).toBeNull()
    // Done or hidden counts as done; unknown never does.
    expect(screen.getByText('2 of 6 done')).toBeTruthy()
    expect(screen.getByText('Some steps could not be checked just now.')).toBeTruthy()
  })

  it('links a step in this app as a route, and one in another app at its origin', async () => {
    renderChecklist()
    const list = await steps()
    expect(
      within(item(list, 'Invite your teammates'))
        .getByRole('link', { name: 'Go to: Invite your teammates' })
        .getAttribute('href'),
    ).toBe('/users/invite')
    expect(
      within(item(list, 'Create your first project'))
        .getByRole('link', { name: 'Go to: Create your first project' })
        .getAttribute('href'),
    ).toBe('https://projects.example.test/projects/new')
    // A done step needs no way there.
    expect(within(item(list, 'Verify your domain')).queryByRole('link')).toBeNull()
  })

  it('shows a step in an app this build cannot reach, without a link', async () => {
    renderChecklist()
    const list = await steps()
    const reports = item(list, 'Connect your reports')
    expect(within(reports).getByText('Not yet')).toBeTruthy()
    expect(within(reports).queryByRole('link')).toBeNull()
  })

  it('hides a step, shows a hidden one again, and hides the whole checklist', async () => {
    const calls = renderChecklist()
    const list = await steps()
    fireEvent.click(
      within(item(list, 'Choose a plan')).getByRole('button', {
        name: 'Hide the step: Choose a plan',
      }),
    )
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'POST', path: `${BASE}/steps/choose_plan/dismissal` }),
    )

    fireEvent.click(screen.getByRole('button', { name: '1 hidden step' }))
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Hidden steps' })).getByRole('button', {
        name: 'Show the step again: Set up single sign-on',
      }),
    )
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: `${BASE}/steps/set_up_sso/dismissal`,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hide the checklist' }))
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: `${BASE}/dismissal` }))
  })

  it('is gone once complete', async () => {
    const calls = renderChecklist({ ...CHECKLIST, complete: true })
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(screen.queryByRole('list', { name: 'Setup steps' })).toBeNull()
  })

  it('is gone once hidden, with the way back on the settings page', async () => {
    const calls = renderChecklist({ ...CHECKLIST, dismissed: true })
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(screen.queryByRole('list', { name: 'Setup steps' })).toBeNull()
  })

  it('offers the hidden checklist back', async () => {
    const calls = renderChecklist({ ...CHECKLIST, dismissed: true }, { restore: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Show the setup checklist again' }))
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'DELETE', path: `${BASE}/dismissal` }),
    )
  })

  it('is not asked for without the settings permission', async () => {
    const calls = renderChecklist(CHECKLIST, { granted: ['billing'] })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(calls).toHaveLength(0)
    expect(screen.queryByRole('list', { name: 'Setup steps' })).toBeNull()
  })

  it('changes nothing in a support session', async () => {
    renderChecklist(CHECKLIST, { readOnly: true })
    await steps()
    expect(screen.getByRole('button', { name: 'Hide the checklist' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('button', { name: 'Hide the step: Choose a plan' })).toHaveProperty(
      'disabled',
      true,
    )
  })
})

describe('the checklist’s rules', () => {
  it('shows it while something is left and it is not hidden', () => {
    expect(showChecklist(CHECKLIST)).toBe(true)
    expect(showChecklist({ ...CHECKLIST, complete: true })).toBe(false)
    expect(showChecklist({ ...CHECKLIST, dismissed: true })).toBe(false)
    expect(showChecklist(null)).toBe(false)
  })

  it('splits hidden steps from shown ones, and never calls an unknown step done', () => {
    const { shown, hidden } = splitSteps(CHECKLIST)
    expect(hidden.map((s) => s.id)).toEqual(['set_up_sso'])
    expect(shown).toHaveLength(5)
    expect(stepState(step('x', { done: true, unknown: true }))).toBe('unknown')
    expect(stepState(step('x', { done: true }))).toBe('done')
    expect(stepState(step('x'))).toBe('todo')
  })
})

describe('a core page’s empty state', () => {
  const renderHint = (path: string, hint: Parameters<typeof SetupHint>[0]['step']) =>
    render(
      <I18nextProvider i18n={createI18n()}>
        <MemoryRouter initialEntries={[path]}>
          <SetupHint step={hint} />
        </MemoryRouter>
      </I18nextProvider>,
    )

  it('links to its step’s page from elsewhere', () => {
    renderHint('/users', 'invite_teammates')
    expect(screen.getByRole('link', { name: 'Invite your teammates' }).getAttribute('href')).toBe(
      '/users/invite',
    )
  })

  it('links to where the step is done on its own page', () => {
    renderHint('/billing', 'choose_plan')
    expect(screen.getByRole('link', { name: 'Choose a plan' }).getAttribute('href')).toBe(
      '#choose_plan',
    )
  })

  it.each([
    ['verify_domain', '/users', '/settings', 'Verify your domain'],
    ['set_up_sso', '/users', '/sso', 'Set up single sign-on'],
  ] as const)('%s links to %s', (hint, from, href, name) => {
    renderHint(from, hint)
    expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href)
  })
})
