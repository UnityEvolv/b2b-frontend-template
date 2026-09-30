/**
 * The security headers every web app is served with.
 *
 * One definition, used three ways: the Vite dev server sends them (report-only,
 * so a violation shows in the console without breaking work), `deploy/web/headers.json`
 * is generated from them for whatever hosts the built apps, and a test holds
 * the policy to its rules.
 *
 * The default is strict: the page's own origin, the API, error tracking,
 * uploaded images and the CAPTCHA widget, and no camera, microphone or
 * screen capture. What a product's pages need beyond that it declares in
 * the product config's `webSecurity`, and every app is served with it.
 */
import { createHash } from 'node:crypto'

import { PRODUCT } from '@b2b-template/product-config'

import { FIRST_PAINT_SCRIPT } from './first-paint.mjs'
import { TOAST_STYLE_HASHES } from './toast-styles.mjs'

/** The one inline script the apps ship, allowed by its hash and nothing else. */
export const FIRST_PAINT_HASH = `'sha256-${createHash('sha256').update(FIRST_PAINT_SCRIPT).digest('base64')}'`

/** The nonce Vite puts on the scripts it injects in development only. */
export const DEV_NONCE = 'vite-dev'

/**
 * What the CAPTCHA widget on public forms needs the browser to reach:
 * the one platform-wide runtime script the apps load.
 */
export { RECAPTCHA_ORIGINS } from './captcha.mjs'

/** @typedef {{ script: string[]; frame: string[]; connect: string[] }} WidgetOrigins */
/** @typedef {import('@b2b-template/product-config').WebSecurity} WebSecurity */

/** The product's additions, from the product config. */
export const PRODUCT_SECURITY = PRODUCT.webSecurity

/** No additions: the strict default. */
const NONE = /** @type {WebSecurity} */ ({ origins: {}, permissions: [] })

/**
 * The policy. `connect` is where the page may reach beyond itself: the API
 * and the error tracker. In production that is derived from the base
 * hostname by whoever serves the app; in development it is every local
 * port. `images` is where pictures come from beyond the page: signed links
 * to uploads. `captcha` adds the widget's origins; without it the policy
 * names no external script and no frame at all. `product` is the product's
 * own additions, per directive.
 *
 * @param {{ connect: string[]; images?: string[]; dev?: boolean; captcha?: WidgetOrigins; product?: WebSecurity }} options
 */
export function contentSecurityPolicy({
  connect,
  images = [],
  dev = false,
  captcha,
  product = NONE,
}) {
  /** The product's sources for a directive. */
  const extra = (/** @type {import('@b2b-template/product-config').CspDirective} */ name) => [
    ...(product.origins[name] ?? []),
  ]
  const frame = [...(captcha ? captcha.frame : []), ...extra('frame')]
  const directives = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'script-src': [
      "'self'",
      FIRST_PAINT_HASH,
      ...(dev ? [`'nonce-${DEV_NONCE}'`] : []),
      ...(captcha ? captcha.script : []),
      ...extra('script'),
    ],
    'style-src': ["'self'", ...TOAST_STYLE_HASHES, ...extra('style')],
    // React sets style attributes for layout; that is style-src-attr, kept
    // separate so stylesheets stay 'self' only.
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...images, ...extra('img')],
    'font-src': ["'self'", ...extra('font')],
    'media-src': ["'self'", 'blob:', ...extra('media')],
    'worker-src': ["'self'", 'blob:', ...extra('worker')],
    // blob: is the page's own memory: a picked image is handed over as an
    // object URL, and uploading it means reading it back.
    'connect-src': [
      "'self'",
      'blob:',
      ...connect,
      ...(captcha ? captcha.connect : []),
      ...extra('connect'),
    ],
    // 'none' cannot sit beside an origin.
    'frame-src': frame.length ? frame : ["'none'"],
    ...(dev ? {} : { 'upgrade-insecure-requests': [] }),
  }
  return Object.entries(directives)
    .map(([name, sources]) => (sources.length ? `${name} ${sources.join(' ')}` : name))
    .join('; ')
}

/**
 * The browser features a page may use. Every one listed is denied unless the
 * product names it, and a named one is allowed on the app's own origin only.
 */
export const DENIED_FEATURES = [
  'camera',
  'microphone',
  'display-capture',
  'geolocation',
  'payment',
  'usb',
]

/** @param {readonly string[]} allowed */
export function permissionsPolicy(allowed = []) {
  const features = [...new Set([...DENIED_FEATURES, ...allowed])]
  return features.map((name) => `${name}=${allowed.includes(name) ? '(self)' : '()'}`).join(', ')
}

/**
 * Every header a web app response carries. The same names the API sends, with
 * values for a page rather than JSON.
 *
 * @param {{ connect: string[]; images?: string[]; dev?: boolean; captcha?: WidgetOrigins; product?: WebSecurity }} options
 * @returns {Record<string, string>}
 */
export function securityHeaders({ connect, images = [], dev = false, captcha, product = NONE }) {
  return {
    [dev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy']:
      contentSecurityPolicy({ connect, images, dev, captcha, product }),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': permissionsPolicy(product.permissions),
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

/** Development: the local dev servers, over http and ws. */
export const DEV_CONNECT = [
  'http://localhost:*',
  'ws://localhost:*',
  'http://127.0.0.1:*',
  'ws://127.0.0.1:*',
]

/**
 * Production placeholders. Whoever serves the built apps replaces these with
 * the API origin derived from the base hostname and the error tracker's
 * ingest origin. A placeholder with no value is dropped.
 */
export const PROD_CONNECT = ['__API_ORIGIN__', '__ERROR_ORIGIN__']

/** Development: images served by the local services. */
export const DEV_IMAGES = ['http://localhost:*', 'http://127.0.0.1:*']

/**
 * Production: the upload bucket, for signed links to uploaded images
 * (profile photos). Filled in at deploy.
 */
export const PROD_IMAGES = ['__STORAGE_ORIGIN__']
