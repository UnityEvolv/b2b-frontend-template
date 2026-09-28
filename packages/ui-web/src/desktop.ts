/**
 * The desktop shell's bridge, as the web app sees it. Present only inside
 * the desktop app, where the preload puts it on the window; every capability
 * is optional so an older shell, or a browser, simply has none. What arrives
 * from it is checked like anything else from outside.
 */

/** What a sign-in in the person's browser came back with. */
export type DesktopSignIn =
  { code: string; verifier: string; next: string } | { error: string; next: string }

export interface DesktopBridge {
  platform: string
  version: string
  /** Open the identity provider's sign-in in the browser; false when the shell refused it. */
  signInWithBrowser?(startUrl: string): Promise<boolean>
  onSignIn?(handler: (result: unknown) => void): () => void
  /** A link into the app, the tray or a notification asks for a page. */
  onNavigate?(handler: (path: unknown) => void): () => void
  /** A system notification, shown only while the window is not in front. */
  notify?(notice: DesktopNotice): void
  /** The tray asks the page to sign the person out. */
  onSignOut?(handler: () => void): () => void
}

export interface DesktopNotice {
  title: string
  body: string
  /** The page a click opens. */
  path: string
}

/** The bridge, when this page runs inside the desktop app. */
export function desktopBridge(): DesktopBridge | null {
  const bridge = (globalThis as { b2bappDesktop?: DesktopBridge }).b2bappDesktop
  return bridge && typeof bridge === 'object' ? bridge : null
}

const isPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !value.includes('\\') &&
  value.length <= 2048

/** A path in the app from the shell, or null. */
export function readDesktopPath(value: unknown): string | null {
  return isPath(value) ? value : null
}

/** A sign-in result from the shell, or null when it is not one. */
export function readDesktopSignIn(value: unknown): DesktopSignIn | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const next = isPath(v.next) ? v.next : '/'
  if (typeof v.code === 'string' && typeof v.verifier === 'string' && v.code && v.verifier)
    return { code: v.code, verifier: v.verifier, next }
  if (typeof v.error === 'string' && /^[a-z_]{1,64}$/.test(v.error)) return { error: v.error, next }
  return null
}
