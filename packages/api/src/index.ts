/**
 * The typed client for every backend service (UO-39).
 *
 * Paths, parameters, bodies and responses are generated from each service's
 * OpenAPI contract (src/generated), so a changed endpoint changes these types
 * and a caller that no longer fits fails to compile. Nothing here is written
 * per endpoint.
 *
 *   const api = createApi({ baseUrl: (service) => `${origin}/${service}`, getToken })
 *   const { data, error } = await api.organization.GET('/v1/organizations/{org_id}', {
 *     params: { path: { org_id } },
 *   })
 *
 * No hostname lives here: the app passes where each service is.
 */
import createClient, { type Client, type ClientOptions, type Middleware } from 'openapi-fetch'

import { serviceNames, type Services } from './generated/index.js'

export type * from './generated/index.js'
export { serviceNames }

export type ServiceName = (typeof serviceNames)[number]

/** Every service, each a client typed by its contract. */
export type Api = { [S in ServiceName]: Client<Services[S]> }

/** The one error envelope every endpoint returns. Branch on code; show message. */
export interface ApiError {
  code: string
  message: string
  fields?: Record<string, string>
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  )
}

export interface ApiOptions {
  /** Where a service is, from the app's config. Never a literal in code. */
  baseUrl: (service: ServiceName) => string
  /** The bearer token for this request, or null when signed out. */
  getToken: () => string | null | Promise<string | null>
  /** For tests and for platforms that bring their own. */
  fetch?: ClientOptions['fetch']
}

export function createApi(options: ApiOptions): Api {
  const auth: Middleware = {
    async onRequest({ request }) {
      const token = await options.getToken()
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
  }
  const api = {} as Record<ServiceName, Client<Services[ServiceName]>>
  for (const service of serviceNames) {
    const client = createClient<Services[typeof service]>({
      baseUrl: options.baseUrl(service),
      ...(options.fetch ? { fetch: options.fetch } : {}),
    })
    client.use(auth)
    api[service] = client
  }
  return api as Api
}
