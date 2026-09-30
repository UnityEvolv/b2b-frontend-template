import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { productionHeaders } from './generate-headers.mjs'

import {
  DEV_CONNECT,
  FIRST_PAINT_HASH,
  PROD_CONNECT,
  PROD_IMAGES,
  RECAPTCHA_ORIGINS,
  REQUIRED_HEADERS,
  contentSecurityPolicy,
  permissionsPolicy,
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

  it('names no provider', () => {
    const prod = contentSecurityPolicy({ connect: PROD_CONNECT }).toLowerCase()
    for (const provider of ['livekit', 'daily', 'agora', 'ably', 'azure', 'skype']) {
      expect(prod).not.toContain(provider)
    }
  })

  it('reaches only the API and error-tracking origins beyond itself', () => {
    expect(sources(contentSecurityPolicy({ connect: PROD_CONNECT }), 'connect-src')).toEqual([
      "'self'",
      'blob:',
      '__API_ORIGIN__',
      '__ERROR_ORIGIN__',
    ])
  })

  it('shows images from the upload bucket, and nowhere else', () => {
    expect(
      sources(contentSecurityPolicy({ connect: PROD_CONNECT, images: PROD_IMAGES }), 'img-src'),
    ).toEqual(["'self'", 'data:', 'blob:', '__STORAGE_ORIGIN__'])
  })

  it('denies the camera, the microphone and screen capture', () => {
    const policy = securityHeaders({ connect: PROD_CONNECT })['Permissions-Policy']
    for (const feature of ['camera', 'microphone', 'display-capture']) {
      expect(policy).toContain(`${feature}=()`)
    }
    expect(policy).not.toContain('(self)')
  })

  it("allows the toast library's injected stylesheet by hash, and no other inline style", () => {
    const style = sources(contentSecurityPolicy({ connect: PROD_CONNECT }), 'style-src')
    expect(style).toEqual(["'self'", ...TOAST_STYLE_HASHES])
    expect(style).not.toContain("'unsafe-inline'")
    expect(TOAST_STYLE_HASHES).toHaveLength(2)
  })

  it("in development also allows Vite's nonced scripts and local ports", () => {
    const dev = contentSecurityPolicy({ connect: DEV_CONNECT, dev: true })
    expect(sources(dev, 'script-src')).toContain("'nonce-vite-dev'")
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

describe('what the product adds to the policy', () => {
  const product = {
    origins: { connect: ['wss://rt.example.com'], frame: ['https://embed.example.com'] },
    permissions: ['camera', 'microphone'],
  }

  it('adds its origins to the directives it names, and nothing else', () => {
    const policy = contentSecurityPolicy({ connect: PROD_CONNECT, product })
    expect(sources(policy, 'connect-src')).toContain('wss://rt.example.com')
    expect(sources(policy, 'frame-src')).toEqual(['https://embed.example.com'])
    expect(sources(policy, 'script-src')).toEqual(["'self'", FIRST_PAINT_HASH])
    // Beside the widget's frames, too.
    const withWidget = contentSecurityPolicy({
      connect: PROD_CONNECT,
      captcha: RECAPTCHA_ORIGINS,
      product,
    })
    expect(sources(withWidget, 'frame-src')).toEqual([
      ...RECAPTCHA_ORIGINS.frame,
      'https://embed.example.com',
    ])
  })

  it('allows the features it names on its own origin, and denies the rest', () => {
    expect(permissionsPolicy(product.permissions)).toBe(
      'camera=(self), microphone=(self), display-capture=(), geolocation=(), payment=(), usb=()',
    )
    expect(permissionsPolicy(['fullscreen'])).toContain('fullscreen=(self)')
  })
})

describe('the generated headers for the kept apps', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const committed = JSON.parse(readFileSync(join(root, 'deploy', 'web', 'headers.json'), 'utf8'))

  it('are what the definition generates', () => {
    expect(committed.headers).toEqual(productionHeaders())
  })

  it('list no provider or product origins, and deny media capture', () => {
    // Hashes are base64, and could spell anything.
    const text = JSON.stringify(committed)
      .replace(/'sha256-[A-Za-z0-9+/=]+'/g, '')
      .toLowerCase()
    for (const name of [
      '__provider_',
      'realtime',
      '__image_origin__',
      'livekit',
      'rtc',
      'unityevolv',
      'office',
    ]) {
      expect(text, name).not.toContain(name)
    }
    const policy = committed.headers['Permissions-Policy']
    for (const feature of ['camera', 'microphone', 'display-capture']) {
      expect(policy).toContain(`${feature}=()`)
    }
  })
})
