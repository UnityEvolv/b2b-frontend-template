/**
 * The product's own names. Change them here and every app follows: the
 * web apps' titles and brand, the keys kept in a browser or on a phone, the
 * recovery-codes file, and the scheme links into the desktop and phone apps
 * use.
 *
 * The phone's app.config.ts and the desktop's electron-builder.yml cannot
 * read JavaScript from here; `apps/mobile/src/app-identity.json` and
 * `apps/desktop/src/defaults.config.ts` repeat the defaults, and a test in
 * each fails when they drift.
 */

/** @type {import('./index.d.mts').Product} */
export const PRODUCT = Object.freeze({
  /** What people see: page titles, the brand, notification titles. */
  productName: 'B2B App',
  /** The prefix of every key kept on a device: `b2bapp:theme`, `b2bapp.session`. */
  storagePrefix: 'b2bapp',
  /** Links into the desktop and phone apps: `b2bapp://accept-invite?token=…`. */
  urlScheme: 'b2bapp',
})

/** A key for something kept on a device, under the product's prefix. */
export function storageKey(name) {
  return `${PRODUCT.storagePrefix}:${name}`
}

/** The file a person saves their recovery codes to. */
export function recoveryCodesFile() {
  return `${PRODUCT.storagePrefix}-recovery-codes.txt`
}
