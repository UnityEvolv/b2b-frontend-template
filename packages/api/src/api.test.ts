import { describe, expect, expectTypeOf, it } from 'vitest'

import { createApi, isApiError, serviceNames, type ApiError } from './index'

const org = '01922b5e-0000-7000-8000-0000000000aa'

/** A fetch that answers from a table and remembers what it was asked. */
function fakeFetch(respond: (request: Request) => Response) {
  const seen: Request[] = []
  const fetch = async (input: Request | string | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    seen.push(request)
    return respond(request)
  }
  return { fetch: fetch as typeof globalThis.fetch, seen }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('createApi', () => {
  it('has a client for every service with a contract', () => {
    const api = createApi({ baseUrl: (s) => `http://test/${s}`, getToken: () => null })
    expect(Object.keys(api).sort()).toEqual([...serviceNames].sort())
  })

  it('calls the service at its base URL with the bearer token, and types the answer', async () => {
    const { fetch, seen } = fakeFetch(() =>
      json(200, {
        org_id: org,
        name: 'Acme',
        time_zone: 'Asia/Kolkata',
        created_at: '2026-09-23T10:00:00Z',
        last_modified_at: '2026-09-23T10:00:00Z',
      }),
    )
    const api = createApi({
      baseUrl: (s) => `http://test/${s}`,
      getToken: async () => 'tok',
      fetch,
    })

    const { data, error } = await api.organization.GET('/v1/organizations/{org_id}', {
      params: { path: { org_id: org } },
    })

    expect(error).toBeUndefined()
    expect(data?.name).toBe('Acme')
    expect(seen[0]?.url).toBe(`http://test/organization/v1/organizations/${org}`)
    expect(seen[0]?.headers.get('Authorization')).toBe('Bearer tok')

    // The contract, checked by the compiler: a changed field breaks this line.
    expectTypeOf(data!).toEqualTypeOf<{
      org_id: string
      name: string
      display_name?: string
      domain?: string
      plan: 'free' | 'team-50' | 'team-200' | 'team-500' | 'enterprise'
      user_cap?: number
      status: 'active' | 'suspended' | 'closing'
      suspended_at?: string
      suspension_reason?: string
      closing_at?: string
      purge_after?: string
      time_zone: string
      remote_control?: boolean
      owner_user_id?: string
      created_at: string
      last_modified_at: string
    }>()
  })

  it('sends no Authorization header when signed out', async () => {
    const { fetch, seen } = fakeFetch(() =>
      json(401, { code: 'unauthenticated', message: 'Sign in to continue.' }),
    )
    const api = createApi({ baseUrl: (s) => `http://test/${s}`, getToken: () => null, fetch })
    await api.organization.GET('/v1/organizations/{org_id}', { params: { path: { org_id: org } } })
    expect(seen[0]?.headers.has('Authorization')).toBe(false)
  })

  it('returns the error envelope, typed, for every error status', async () => {
    const { fetch } = fakeFetch(() =>
      json(403, { code: 'forbidden', message: 'Not permitted for this organization.' }),
    )
    const api = createApi({ baseUrl: (s) => `http://test/${s}`, getToken: () => 'tok', fetch })
    const { data, error, response } = await api.organization.GET('/v1/organizations/{org_id}', {
      params: { path: { org_id: org } },
    })

    expect(data).toBeUndefined()
    expect(response.status).toBe(403)
    expect(isApiError(error)).toBe(true)
    expect(error?.code).toBe('forbidden')
    expectTypeOf(error!).toMatchTypeOf<ApiError>()
  })

  it('rejects a path the contract does not have, at compile time', () => {
    const api = createApi({ baseUrl: (s) => `http://test/${s}`, getToken: () => null })
    const misspelt = '/v1/organisations/{org_id}' as const
    const call = () =>
      // @ts-expect-error: not in api/organization.yaml
      api.organization.GET(misspelt, { params: { path: { org_id: org } } })
    expect(typeof call).toBe('function')
  })
})

describe('isApiError', () => {
  it('knows the envelope', () => {
    expect(isApiError({ code: 'x', message: 'y' })).toBe(true)
    expect(isApiError({ message: 'y' })).toBe(false)
    expect(isApiError('boom')).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})
