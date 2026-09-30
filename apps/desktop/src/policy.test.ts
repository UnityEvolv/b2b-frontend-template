import { describe, expect, it } from 'vitest'

import { contentType, navigationDecision, resolveAppPath, securityHeaders } from './policy'

const APP = 'app://account'
const DEV = 'http://localhost:5173'

describe('where the window may go', () => {
  it('stays on the app, sends other sites to the browser, drops the rest', () => {
    expect(navigationDecision(`${APP}/settings/security`, [APP])).toBe('allow')
    expect(navigationDecision(`${DEV}/settings/security`, [APP, DEV])).toBe('allow')
    expect(navigationDecision(`${DEV}/settings/security`, [APP])).toBe('open-externally')
    expect(navigationDecision('https://example.org/help', [APP])).toBe('open-externally')
    expect(navigationDecision('file:///etc/passwd', [APP])).toBe('deny')
    expect(navigationDecision('javascript:alert(1)', [APP])).toBe('deny')
    expect(navigationDecision('not a url', [APP])).toBe('deny')
  })
})

describe('the headers the packaged app is served with', () => {
  const served = {
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' __STORAGE_ORIGIN__; connect-src 'self' __API_ORIGIN__ __ERROR_ORIGIN__",
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'X-Frame-Options': 'DENY',
  }

  it('fills the deploy placeholders from configuration', () => {
    const out = securityHeaders(served, { api: 'https://api.example' })
    expect(out['Content-Security-Policy']).toBe(
      "default-src 'self'; img-src 'self'; connect-src 'self' https://api.example",
    )
    expect(out['X-Frame-Options']).toBe('DENY')
  })

  it('drops a placeholder with no value rather than serving it', () => {
    const out = securityHeaders(served, {})
    expect(out['Content-Security-Policy']).toBe(
      "default-src 'self'; img-src 'self'; connect-src 'self'",
    )
    expect(out['Content-Security-Policy']).not.toContain('__')
  })

  it('leaves transport security to the browser', () => {
    expect(securityHeaders(served, {})).not.toHaveProperty('Strict-Transport-Security')
  })
})

describe('serving the packaged app', () => {
  const files = new Set(['index.html', 'assets/app.js', 'assets/app.css'])
  const exists = (p: string) => files.has(p)

  it('serves a file that exists and the index for a client-side route', () => {
    expect(resolveAppPath('/assets/app.js', exists)).toBe('assets/app.js')
    expect(resolveAppPath('/', exists)).toBe('index.html')
    expect(resolveAppPath('/settings/security23', exists)).toBe('index.html')
    expect(resolveAppPath('/assets/missing.js', exists)).toBe('index.html')
  })

  it('never leaves the web root', () => {
    expect(resolveAppPath('/../package.json', exists)).toBeNull()
    expect(resolveAppPath('/assets/%2e%2e/%2e%2e/secret', exists)).toBeNull()
  })

  it('announces a content type by extension', () => {
    expect(contentType('index.html')).toContain('text/html')
    expect(contentType('assets/app.js')).toContain('text/javascript')
    expect(contentType('assets/font.woff2')).toBe('font/woff2')
    expect(contentType('assets/blob.bin')).toBe('application/octet-stream')
  })
})
