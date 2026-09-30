import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { categoryOf, feedHeading, type FeedEntry } from '@b2b-template/client'
import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { createProjectsApi, projectsBaseUrl, refusal } from './api'
import { routes } from './definition'
import { keyFor } from './pages/NewProjectPage'

const here = dirname(fileURLToPath(import.meta.url))

describe('the generated client', () => {
  it('is generated from the vendored contract, never by hand', () => {
    const generated = readFileSync(join(here, 'generated', 'projects.ts'), 'utf8')
    expect(generated).toMatch(/^\/\/ Generated from specs\/projects\.yaml/)
    expect(generated).toContain("'/v1/organizations/{org_id}/projects/{project_id}/cover'")
  })

  it('calls the projects service with the session’s token', async () => {
    const seen: Request[] = []
    const api = createProjectsApi({
      baseUrl: 'https://api.test/projects',
      getToken: () => 'tok',
      fetch: (async (request: Request) => {
        seen.push(request)
        return new Response(JSON.stringify({ projects: [] }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }) as typeof fetch,
    })
    const { data } = await api.GET('/v1/organizations/{org_id}/projects', {
      params: { path: { org_id: 'o-1' } },
    })
    expect(data).toEqual({ projects: [] })
    expect(seen[0]?.url).toBe('https://api.test/projects/v1/organizations/o-1/projects')
    expect(seen[0]?.headers.get('Authorization')).toBe('Bearer tok')
  })

  it('finds the service where the template’s services are, or its own origin', () => {
    expect(projectsBaseUrl({ VITE_API_ORIGIN: 'https://api.test/' })).toBe(
      'https://api.test/projects',
    )
    expect(
      projectsBaseUrl({
        VITE_API_ORIGIN: 'https://api.test',
        VITE_API_ORIGIN_PROJECTS: 'http://localhost:8095',
      }),
    ).toBe('http://localhost:8095')
    expect(projectsBaseUrl({})).toBeUndefined()
  })
})

describe('a refusal', () => {
  it('over the plan’s cap names the plan, the limit and the plan that allows more', () => {
    const error = {
      code: 'plan.limit_reached',
      message: 'The free plan allows 3 projects.',
      fields: { plan: 'free', limit: 'projects', required_plan: 'team' },
    }
    expect(refusal(403, error)).toEqual({
      kind: 'plan',
      plan: 'free',
      limit: 'projects',
      requiredPlan: 'team',
    })
    const top = { ...error, fields: { plan: 'business', limit: 'projects' } }
    expect(refusal(403, top)).toEqual({ kind: 'plan', plan: 'business', limit: 'projects' })
  })

  it('any other 403 is the permission group', () => {
    expect(refusal(403, { code: 'forbidden', message: 'No.' })).toEqual({ kind: 'forbidden' })
    expect(refusal(400, { code: 'request.invalid', message: 'Name is required.' })).toEqual({
      kind: 'error',
      error: { code: 'request.invalid', message: 'Name is required.' },
    })
  })
})

describe('the idempotency key', () => {
  let n = 0
  const fresh = () => `k-${++n}`
  const draft = { name: 'Apollo', description: '' }

  it('is fresh for a new create, and reused when the same one is submitted again', () => {
    const first = keyFor(null, draft, fresh)
    expect(keyFor(first, { ...draft }, fresh).key).toBe(first.key)
    expect(keyFor(first, { ...draft, name: 'Gemini' }, fresh).key).not.toBe(first.key)
    expect(keyFor(null, draft, fresh).key).not.toBe(first.key)
  })
})

describe('the project_shared notification', () => {
  const category = {
    id: 'project_shared',
    label: 'Shared projects',
    description: 'When someone shares a project with you.',
    audience: 'member' as const,
    default_channels: { in_app: true, push: true, email: false, digest: false },
    channels: ['in_app', 'push'] as ('in_app' | 'push')[],
    quiet_hours: true,
    batched: false,
  }
  const entry = {
    id: 'e-1',
    category: 'project_shared',
    kind: 'project_shared',
    data: { project: 'Apollo', project_id: 'p-1' },
    link: '/projects/0190a000-0000-7000-8000-0000000000f1',
    count: 1,
    items: [],
    occurred_at: '2026-10-01T09:00:00Z',
    read: false,
  } as unknown as FeedEntry

  it('is named by the registry, as the bell names every category', () => {
    expect(feedHeading(entry, [category])).toBe('Shared projects')
    expect(categoryOf(entry, [category])?.audience).toBe('member')
  })

  it('links to a page this app has: the project', () => {
    const matched = matchRoutes(
      routes.map((r) => ({ path: r.path })),
      entry.link,
    )
    expect(matched?.at(-1)?.route.path).toBe('/projects/:projectId')
  })
})
