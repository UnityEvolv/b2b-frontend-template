import { describe, expect, it } from 'vitest'

import {
  DEV_CONNECT,
  FIRST_PAINT_HASH,
  PROD_CONNECT,
  PROD_IMAGES,
  PROVIDER_ORIGINS,
  RECAPTCHA_ORIGINS,
  REQUIRED_HEADERS,
  contentSecurityPolicy,
  securityHeaders,
} from './headers.mjs'
import { TOAST_STYLE_HASHES } from './toast-styles.mjs'

const sources = (policy, directive) => {
  const part = policy.split('; ').find((p) => p.startsWith(directive + ' ') || p === directive)
  return part ? part.slice(directive.length).trim().split(' ').filter(Boolean) : null
}

describe('web security headers', () => {
  it('sends every agreed header in production, and fails here if one is dropped', () => {
    const headers = securityHeaders({ connect: PROD_CONNECT })
    for (const name of REQUIRED_HEADERS) expect(headers[name], name).toBeTruthy()
    expect(Object.keys(headers).sort()).toEqual([...REQUIRED_HEADERS].sort())
  })

  it('is report-only in development, enforced in production', () => {
    expect(securityHeaders({ connect: DEV_CONNECT, dev: true })).toHaveProperty(
      'Content-Security-Policy-Report-Only',
    )
    expect(securityHeaders({ connect: DEV_CONNECT, dev: true })).not.toHaveProperty(
      'Content-Security-Policy',
    )
    expect(securityHeaders({ connect: PROD_CONNECT })).toHaveProperty('Content-Security-Policy')
  })

  it('allows scripts only from self and the hashed first-paint script', () => {
    const prod = contentSecurityPolicy({ connect: PROD_CONNECT })
    expect(sources(prod, 'script-src')).toEqual(["'self'", FIRST_PAINT_HASH])
    expect(prod).not.toContain("'unsafe-inline' 'self'")
    expect(sources(prod, 'script-src')).not.toContain("'unsafe-inline'")
    expect(sources(prod, 'script-src')).not.toContain("'unsafe-eval'")
    expect(FIRST_PAINT_HASH).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/)
  })

  it('forbids framing, plugins and foreign form targets', () => {
    const prod = contentSecurityPolicy({ connect: PROD_CONNECT })
    expect(sources(prod, 'frame-ancestors')).toEqual(["'none'"])
    expect(sources(prod, 'object-src')).toEqual(["'none'"])
    expect(sources(prod, 'base-uri')).toEqual(["'self'"])
    expect(sources(prod, 'form-action')).toEqual(["'self'"])
    expect(prod).toContain('upgrade-insecure-requests')
  })

  it('names no provider: those are added per org by the backend', () => {
    const prod = contentSecurityPolicy({ connect: PROD_CONNECT }).toLowerCase()
    for (const provider of ['livekit', 'daily', 'agora', 'ably', 'azure', 'skype']) {
      expect(prod).not.toContain(provider)
    }
  })

  it('reaches only the API, realtime and error-tracking origins beyond itself', () => {
    expect(sources(contentSecurityPolicy({ connect: PROD_CONNECT }), 'connect-src')).toEqual([
      "'self'",
      'blob:',
      '__API_ORIGIN__',
      '__REALTIME_ORIGIN__',
      '__ERROR_ORIGIN__',
    ])
  })

  it('shows images from the realtime origin and the upload bucket, and nowhere else', () => {
    expect(
      sources(contentSecurityPolicy({ connect: PROD_CONNECT, images: PROD_IMAGES }), 'img-src'),
    ).toEqual(["'self'", 'data:', 'blob:', '__IMAGE_ORIGIN__', '__STORAGE_ORIGIN__'])
  })

  it("allows the toast library's injected stylesheet by hash, and no other inline style", () => {
    const style = sources(contentSecurityPolicy({ connect: PROD_CONNECT }), 'style-src')
    expect(style).toEqual(["'self'", ...TOAST_STYLE_HASHES])
    expect(style).not.toContain("'unsafe-inline'")
    expect(TOAST_STYLE_HASHES).toHaveLength(2)
  })

  it("in development also allows Vite's nonced scripts and local ports", () => {
    const dev = contentSecurityPolicy({ connect: DEV_CONNECT, dev: true })
    expect(sources(dev, 'script-src')).toContain("'nonce-unityofis-dev'")
    expect(sources(dev, 'connect-src')).toContain('ws://localhost:*')
    expect(dev).not.toContain('upgrade-insecure-requests')
  })
})

describe('the CAPTCHA widget in the policy', () => {
  it('is named only when asked for, and then in script, frame and connect', () => {
    const without = contentSecurityPolicy({ connect: PROD_CONNECT })
    expect(without.toLowerCase()).not.toContain('recaptcha')
    expect(sources(without, 'frame-src')).toEqual(["'none'"])

    const withWidget = contentSecurityPolicy({ connect: PROD_CONNECT, captcha: RECAPTCHA_ORIGINS })
    for (const origin of RECAPTCHA_ORIGINS.script) {
      expect(sources(withWidget, 'script-src')).toContain(origin)
    }
    expect(sources(withWidget, 'frame-src')).toEqual(RECAPTCHA_ORIGINS.frame)
    expect(sources(withWidget, 'frame-src')).not.toContain("'none'")
    for (const origin of RECAPTCHA_ORIGINS.connect) {
      expect(sources(withWidget, 'connect-src')).toContain(origin)
    }
    // Still no inline scripts, and still no provider.
    expect(sources(withWidget, 'script-src')).not.toContain("'unsafe-inline'")
    expect(withWidget.toLowerCase()).not.toContain('livekit')
  })

  it('is in the served production headers, since public forms exist in every app', () => {
    const headers = securityHeaders({ connect: PROD_CONNECT, captcha: RECAPTCHA_ORIGINS })
    expect(headers['Content-Security-Policy']).toContain('https://www.google.com/recaptcha/')
  })
})

describe('the org’s provider origins in the served policy', () => {
  it('leaves a placeholder per directive a provider needs, and only when asked', () => {
    const base = contentSecurityPolicy({ connect: PROD_CONNECT, captcha: RECAPTCHA_ORIGINS })
    expect(base).not.toContain('__PROVIDER_')

    const served = contentSecurityPolicy({
      connect: PROD_CONNECT,
      captcha: RECAPTCHA_ORIGINS,
      providers: true,
    })
    expect(sources(served, 'connect-src')).toContain(PROVIDER_ORIGINS.connect)
    expect(sources(served, 'media-src')).toContain(PROVIDER_ORIGINS.media)
    expect(sources(served, 'worker-src')).toContain(PROVIDER_ORIGINS.worker)
    expect(sources(served, 'script-src')).toContain(PROVIDER_ORIGINS.script)
    expect(sources(served, 'frame-src')).toContain(PROVIDER_ORIGINS.frame)
    // Never an origin of its own: the rtc service says which, per org.
    expect(served.toLowerCase()).not.toContain('livekit')
  })

  it('never puts a frame origin beside none', () => {
    const noWidget = contentSecurityPolicy({ connect: PROD_CONNECT, providers: true })
    expect(sources(noWidget, 'frame-src')).toEqual(["'none'"])
  })
})
