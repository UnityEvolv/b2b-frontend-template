import {
  createAuth,
  developmentSessionSource,
  serviceOriginsFromEnv,
  type AppDefinition,
} from '@b2b-template/ui-web'

import { projectsBaseUrl } from './api'
import { projectsApp } from './definition'

/**
 * Sign-in against the template's identity service, as a member app. A
 * development build can still take the automatic developer session with
 * VITE_DEV_SESSION=1; the pages then say they are not connected.
 */
const auth =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SESSION === '1'
    ? undefined
    : createAuth({ app: 'account', ...serviceOriginsFromEnv(import.meta.env) })

const admin = import.meta.env.VITE_ADMIN_ORIGIN

export const definition: AppDefinition = {
  ...projectsApp({
    sessionSource: auth?.sessionSource ?? developmentSessionSource(import.meta.env.DEV, []),
    ...(auth ? { auth } : {}),
    projectsUrl: projectsBaseUrl(import.meta.env),
    ...(admin ? { billingUrl: `${admin.replace(/\/$/, '')}/billing` } : {}),
  }),
  // From the build's configuration: no DSN on a laptop, so nothing is sent.
  errorTracking: {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT ?? (import.meta.env.DEV ? 'local' : 'production'),
    release: import.meta.env.VITE_RELEASE,
  },
}
