/**
 * The projects service's client, generated from its contract
 * (specs/projects.yaml, a copy of the backend's
 * examples/projects/api/projects.yaml) exactly as packages/api generates the
 * template's: openapi-typescript for the types, openapi-fetch for the calls.
 * The template's own `Api` does not know this service, and does not need to.
 */
import { isApiError, type ApiError } from '@b2b-template/api'
import createClient, { type Client, type Middleware } from 'openapi-fetch'

import type { components, paths } from './generated/projects'

export type ProjectsApi = Client<paths>
export type Project = components['schemas']['Project']
export type ProjectMember = components['schemas']['ProjectMember']

export interface ProjectsApiOptions {
  /** Where the projects service is, from the build's configuration. */
  baseUrl: string
  /** The session's bearer token: the template's `Auth.getToken`. */
  getToken: () => string | null | Promise<string | null>
  /** For tests. */
  fetch?: typeof globalThis.fetch
}

export function createProjectsApi(options: ProjectsApiOptions): ProjectsApi {
  const auth: Middleware = {
    async onRequest({ request }) {
      const token = await options.getToken()
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
  }
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })
  client.use(auth)
  return client
}

/**
 * Where the projects service is: its own origin on a laptop
 * (`VITE_API_ORIGIN_PROJECTS`), else `/projects` under the deployed gateway
 * (`VITE_API_ORIGIN`), as the template's services are.
 */
export function projectsBaseUrl(env: Record<string, unknown>): string | undefined {
  const text = (key: string) => {
    const value = env[key]
    return typeof value === 'string' && value !== '' ? value.replace(/\/$/, '') : undefined
  }
  const own = text('VITE_API_ORIGIN_PROJECTS')
  if (own) return own
  const gateway = text('VITE_API_ORIGIN')
  return gateway ? `${gateway}/projects` : undefined
}

/** What a refused change means for the page. */
export type Refusal =
  | { kind: 'plan'; plan: string; limit: string; requiredPlan?: string }
  | { kind: 'forbidden' }
  | { kind: 'error'; error: ApiError | null }

/**
 * A refusal, from the status and the error envelope. Over the plan's cap
 * the API answers 403 `plan.limit_reached` with the plan, the limit and the
 * band that allows more; any other 403 is the permission group.
 */
export function refusal(status: number | undefined, error: unknown): Refusal {
  const envelope = isApiError(error) ? error : null
  if (envelope?.code === 'plan.limit_reached') {
    const fields = envelope.fields ?? {}
    return {
      kind: 'plan',
      plan: fields.plan ?? '',
      limit: fields.limit ?? '',
      ...(fields.required_plan ? { requiredPlan: fields.required_plan } : {}),
    }
  }
  if (status === 403) return { kind: 'forbidden' }
  return { kind: 'error', error: envelope }
}

/** The one permission group every write needs, as the backend's product declares it. */
export const PROJECTS_PERMISSION = 'projects'

/** The cover image rules (the backend's `project-cover` storage purpose). */
export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const COVER_MAX_BYTES = 2 << 20
