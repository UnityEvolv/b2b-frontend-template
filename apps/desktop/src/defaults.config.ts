/**
 * The desktop shell's development defaults. Configuration, so a host may be
 * named here and nowhere else in the shell.
 */

/** Where the account app's dev server runs, unless DESKTOP_DEV_URL says otherwise. */
export const DEV_URL_DEFAULT = 'http://localhost:5173'

/** The origin the packaged web app is served from, inside the shell. */
export const APP_ORIGIN = 'app://account'

/**
 * The scheme links into the app use, registered by the installer:
 * `b2bapp://accept-invite?token=…` opens the app on that page. Must match
 * `protocols` in electron-builder.yml and the identity service's desktop
 * redirect.
 */
export const SCHEME = 'b2bapp'

/** The app's identity on Windows, for notifications. Must match `appId` in electron-builder.yml. */
export const APP_ID = 'com.example.b2bapp'

/** The name the tray shows. Must match `productName` in electron-builder.yml. */
export const PRODUCT_NAME = 'B2B App'
