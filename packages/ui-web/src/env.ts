import { serviceNames, type ServiceName } from '@b2b-template/api'

/**
 * The service addresses an app's build carries. Deployed, `VITE_API_ORIGIN`
 * is the gateway and every service is a path under it. On a laptop the
 * compose stack gives each service its own port, named per service in the
 * app's `.env.development`; the app passes `import.meta.env` here.
 */
export function serviceOriginsFromEnv(env: Record<string, string | boolean | undefined>): {
  apiOrigin?: string
  serviceOrigin: Partial<Record<ServiceName, string | undefined>>
} {
  const text = (key: string) => {
    const value = env[key]
    return typeof value === 'string' && value !== '' ? value : undefined
  }
  const serviceOrigin: Partial<Record<ServiceName, string | undefined>> = {}
  // Every service the contracts name, so a new one needs no edit here.
  for (const name of serviceNames) {
    const value = text(`VITE_API_ORIGIN_${name.toUpperCase()}`)
    if (value) serviceOrigin[name] = value
  }
  const apiOrigin = text('VITE_API_ORIGIN')
  return { ...(apiOrigin ? { apiOrigin } : {}), serviceOrigin }
}

/**
 * Where each web app is, from the build's configuration: `VITE_<APP>_ORIGIN`
 * names the app `<app>` (`VITE_ADMIN_ORIGIN` is the admin app,
 * `VITE_PROJECTS_ORIGIN` a product's `projects`). Used for a link into
 * another app, such as an onboarding step's or a support session's. The
 * API's own (`VITE_API_ORIGIN`) is not an app.
 */
export function appOriginsFromEnv(
  env: Record<string, string | boolean | undefined>,
): Record<string, string> {
  const origins: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    const name = /^VITE_([A-Z][A-Z0-9_]*)_ORIGIN$/.exec(key)?.[1]
    if (!name || name === 'API' || typeof value !== 'string' || value === '') continue
    origins[name.toLowerCase()] = value.replace(/\/+$/, '')
  }
  return origins
}
