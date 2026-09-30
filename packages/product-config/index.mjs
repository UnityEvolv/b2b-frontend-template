/**
 * The product's own names. Change them here and every app follows: the
 * web apps' titles and brand, the keys kept in a browser or on a phone, the
 * recovery-codes file, and the scheme links into the desktop and phone apps
 * use.
 *
 * The logo is `logo.svg` beside this file, a starter placeholder: replace the
 * file, keeping its name, and the web apps' brand shows the product's own.
 *
 * The phone's app.config.ts and the desktop's electron-builder.yml cannot
 * read JavaScript from here; `apps/mobile/src/app-identity.json` and
 * `apps/desktop/src/defaults.config.ts` repeat the defaults, and a test in
 * each fails when they drift.
 */

/** @type {import('./index.d.mts').Product} */
export const PRODUCT = Object.freeze({
  /**
   * The product's id, the same as the backend's PRODUCT_ID: lower case
   * letters, digits and hyphens. The identity service names its cookies
   * after it (see `cookieName`).
   */
  productId: 'b2bapp',
  /** What people see: page titles, the brand, notification titles. */
  productName: 'B2B App',
  /** The prefix of every key kept on a device: `b2bapp:theme`, `b2bapp.session`. */
  storagePrefix: 'b2bapp',
  /** Links into the desktop and phone apps: `b2bapp://accept-invite?token=…`. */
  urlScheme: 'b2bapp',
  /**
   * The name as the brand writes it beside the logo, in pieces that take the
   * theme's secondary and primary colours in turn. Joined as written, so a
   * space belongs inside a piece; one piece is one colour.
   */
  wordmark: Object.freeze(['B2B ', 'App']),
  /**
   * What the web apps' security headers allow beyond their strict default,
   * for what the product's own pages need. Empty, the policy reaches only
   * the page's origin, the API, error tracking and uploaded images.
   *
   * `origins` adds sources to a Content-Security-Policy directive, by the
   * directive's name without `-src`: `{ connect: ['wss://rt.example.com'],
   * media: ['https://media.example.com'] }`. `permissions` names the
   * browser features the pages use, allowed on the app's own origin only:
   * `['camera', 'microphone', 'display-capture']`. Anything not named is
   * denied.
   */
  webSecurity: Object.freeze({
    origins: Object.freeze({}),
    permissions: Object.freeze([]),
  }),
})

/** A key for something kept on a device, under the product's prefix. */
export function storageKey(name) {
  return `${PRODUCT.storagePrefix}:${name}`
}

/** The file a person saves their recovery codes to. */
export function recoveryCodesFile() {
  return `${PRODUCT.storagePrefix}-recovery-codes.txt`
}

/**
 * A cookie the identity service sets, by the backend's rule:
 * `<id>_<name>` with any hyphen in the id as an underscore, so
 * `cookieName('session')` is `b2bapp_session`. A deployment that sets the
 * backend's COOKIE_PREFIX to something other than its PRODUCT_ID sets
 * productId here to that prefix.
 */
export function cookieName(name) {
  return `${PRODUCT.productId.replace(/-/g, '_')}_${name}`
}
