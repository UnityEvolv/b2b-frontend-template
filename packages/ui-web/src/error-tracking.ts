import * as Sentry from '@sentry/react'

import type { AppName } from './app'

/**
 * Unhandled errors go to Sentry with the app, the release and the environment
 * (UO-44). Ids only: the signed-in user's id and, once sessions carry one, the
 * org id. Never a name, an email or a token.
 */
export interface ErrorTrackingConfig {
  /** From the build's configuration. Empty means off, which is what a laptop wants. */
  dsn?: string
  environment?: string
  release?: string
}

let active = false

export function initErrorTracking(app: AppName, config: ErrorTrackingConfig | undefined): boolean {
  if (!config?.dsn) return false
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment ?? 'production',
    release: config.release,
    // PII is off by default in this SDK; nothing here turns it on.
    tracesSampleRate: 0,
    initialScope: { tags: { app } },
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies
        delete event.request.data
        delete event.request.headers
      }
      if (event.user) event.user = { id: event.user.id }
      return event
    },
  })
  active = true
  return true
}

export function isErrorTrackingActive(): boolean {
  return active
}

/** Report an error a boundary caught. */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (!active) return
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context ?? {})) scope.setTag(key, value)
    Sentry.captureException(error)
  })
}

/** Who is signed in, by id, or nobody. */
export function setErrorTrackingUser(userId: string | null): void {
  if (!active) return
  Sentry.setUser(userId ? { id: userId } : null)
}
