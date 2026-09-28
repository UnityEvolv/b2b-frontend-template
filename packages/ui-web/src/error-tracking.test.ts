import { beforeEach, describe, expect, it, vi } from 'vitest'

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  withScope: vi.fn((fn: (scope: { setTag: (k: string, v: string) => void }) => void) =>
    fn({ setTag: vi.fn() }),
  ),
}))
vi.mock('@sentry/react', () => sentry)

import { initErrorTracking, reportError, setErrorTrackingUser } from './error-tracking'

describe('error tracking', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing without a DSN, so a laptop sends nothing', () => {
    expect(initErrorTracking('account', undefined)).toBe(false)
    expect(initErrorTracking('account', { dsn: '' })).toBe(false)
    expect(sentry.init).not.toHaveBeenCalled()
    reportError(new Error('x'))
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('starts with the app, release and environment, and no PII', () => {
    expect(
      initErrorTracking('admin', {
        dsn: 'https://k@o.ingest.sentry.io/1',
        release: 'abc123',
        environment: 'dev',
      }),
    ).toBe(true)
    const options = sentry.init.mock.calls[0]![0] as {
      sendDefaultPii?: boolean
      release: string
      environment: string
      initialScope: { tags: { app: string } }
      beforeSend: (e: Record<string, unknown>) => Record<string, unknown>
    }
    expect(options.sendDefaultPii).not.toBe(true)
    expect(options.release).toBe('abc123')
    expect(options.environment).toBe('dev')
    expect(options.initialScope.tags.app).toBe('admin')

    const scrubbed = options.beforeSend({
      user: { id: 'u1', email: 'a@example.com', ip_address: '1.2.3.4' },
      request: { cookies: 'x', headers: { Authorization: 'Bearer t' }, url: '/x' },
    })
    expect(scrubbed.user).toEqual({ id: 'u1' })
    expect(scrubbed.request).toEqual({ url: '/x' })
  })

  it('reports caught errors and the signed-in user by id', () => {
    initErrorTracking('account', { dsn: 'https://k@o.ingest.sentry.io/1' })
    reportError(new Error('boundary'), { route: '/offices' })
    expect(sentry.captureException).toHaveBeenCalledTimes(1)
    setErrorTrackingUser('user-1')
    expect(sentry.setUser).toHaveBeenCalledWith({ id: 'user-1' })
    setErrorTrackingUser(null)
    expect(sentry.setUser).toHaveBeenLastCalledWith(null)
  })
})
