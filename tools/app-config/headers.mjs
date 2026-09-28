/**
 * The security headers every web app is served with (UO-120).
 *
 * One definition, used three ways: the Vite dev server sends them (report-only,
 * so a violation shows in the console without breaking work), `deploy/web/headers.json`
 * is generated from them for whatever hosts the built apps, and a test holds
 * the policy to its rules. The backend assembles the same base policy plus the
 * origins of the providers an org has configured, at response time; nothing
 * here ever names a provider.
 */
import { createHash } from 'node:crypto'

import { FIRST_PAINT_SCRIPT } from './first-paint.mjs'
import { TOAST_STYLE_HASHES } from './toast-styles.mjs'

/** The one inline script the apps ship, allowed by its hash and nothing else. */
export const FIRST_PAINT_HASH = `'sha256-${createHash('sha256').update(FIRST_PAINT_SCRIPT).digest('base64')}'`

/** The nonce Vite puts on the scripts it injects in development only. */
export const DEV_NONCE = 'unityofis-dev'

/**
 * What the CAPTCHA widget on public forms needs the browser to reach (UO-75):
 * the one platform-wide runtime script the apps load. The backend's verifier
 * declares the same origins for the per-org policy it assembles.
 */
export { RECAPTCHA_ORIGINS } from './captcha.mjs'

/** @typedef {{ script: string[]; frame: string[]; connect: string[] }} WidgetOrigins */

/**
 * Where the org's provider origins go in a served policy (UO-142): the web
 * apps' server asks the rtc service for them as it serves the page, by the
 * org its cookie names, and fills these in; none for an org on the built-in
 * provider, or an unknown one. The frame placeholder rides on the widget's
 * frames, since 'none' cannot sit beside an origin.
 */
export const PROVIDER_ORIGINS = {
  connect: '__PROVIDER_CONNECT__',
  media: '__PROVIDER_MEDIA__',
  worker: '__PROVIDER_WORKER__',
  frame: '__PROVIDER_FRAME__',
  script: '__PROVIDER_SCRIPT__',
}

/**
 * The base policy, before any provider. `connect` is where the page may reach
 * beyond itself: the API and the realtime socket. In production that is
 * derived from the base hostname by whoever serves the app; in development it
 * is every local port. `images` is where pictures come from beyond the page:
 * the office backgrounds the realtime service serves. `captcha` adds the widget's origins; without it the
 * policy names no external script and no frame at all.
 *
 * @param {{ connect: string[]; images?: string[]; dev?: boolean; captcha?: WidgetOrigins; providers?: boolean }} options
 */
export function contentSecurityPolicy({
  connect,
  images = [],
  dev = false,
  captcha,
  providers = false,
}) {
  /** The provider placeholder for a directive, when the policy has them. */
  const org = (/** @type {keyof typeof PROVIDER_ORIGINS} */ name) =>
    providers ? [PROVIDER_ORIGINS[name]] : []
  const script = [
    "'self'",
    FIRST_PAINT_HASH,
    ...(dev ? [`'nonce-${DEV_NONCE}'`] : []),
    ...(captcha ? captcha.script : []),
    ...org('script'),
  ]
  const directives = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'script-src': script,
    'style-src': ["'self'", ...TOAST_STYLE_HASHES],
    // React sets style attributes for layout; that is style-src-attr, kept
    // separate so stylesheets stay 'self' only.
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...images],
    'font-src': ["'self'"],
    'media-src': ["'self'", 'blob:', ...org('media')],
    'worker-src': ["'self'", 'blob:', ...org('worker')],
    // blob: is the page's own memory: the builder hands over a picked image as
    // an object URL, and uploading it means reading it back.
    'connect-src': [
      "'self'",
      'blob:',
      ...connect,
      ...(captcha ? captcha.connect : []),
      ...org('connect'),
    ],
    // 'none' cannot sit beside an origin.
    'frame-src': captcha ? [...captcha.frame, ...org('frame')] : ["'none'"],
    ...(dev ? {} : { 'upgrade-insecure-requests': [] }),
  }
  return Object.entries(directives)
    .map(([name, sources]) => (sources.length ? `${name} ${sources.join(' ')}` : name))
    .join('; ')
}

/**
 * Every header a web app response carries. The same names the API sends, with
 * values for a page rather than JSON.
 *
 * @param {{ connect: string[]; images?: string[]; dev?: boolean; captcha?: WidgetOrigins; providers?: boolean }} options
 * @returns {Record<string, string>}
 */
export function securityHeaders({ connect, images = [], dev = false, captcha, providers = false }) {
  return {
    [dev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy']:
      contentSecurityPolicy({ connect, images, dev, captcha, providers }),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // The office needs a camera, a microphone and screen capture, on this
    // origin only. Everything else is off.
    'Permissions-Policy':
      'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  }
}

/** Header names, for the check that fails when one goes missing. */
export const REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
]

/** Development: the local dev servers, API and realtime, over http and ws. */
export const DEV_CONNECT = [
  'http://localhost:*',
  'ws://localhost:*',
  'http://127.0.0.1:*',
  'ws://127.0.0.1:*',
]

/**
 * Production placeholders. Whoever serves the built apps replaces these with
 * the API and realtime origins derived from the base hostname and the error
 * tracker's ingest origin, and appends the org's provider origins when it
 * knows the org. A placeholder with no value is dropped.
 */
export const PROD_CONNECT = ['__API_ORIGIN__', '__REALTIME_ORIGIN__', '__ERROR_ORIGIN__']

/** Development: the realtime dev server serves the office backgrounds. */
export const DEV_IMAGES = ['http://localhost:*', 'http://127.0.0.1:*']

/**
 * Production: the realtime origin over https, for the built-in office
 * backgrounds, and the upload bucket, for signed links to uploaded images
 * (profile photos, template backgrounds). Both filled in at deploy.
 */
export const PROD_IMAGES = ['__IMAGE_ORIGIN__', '__STORAGE_ORIGIN__']
