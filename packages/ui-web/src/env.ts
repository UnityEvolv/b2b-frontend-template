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
