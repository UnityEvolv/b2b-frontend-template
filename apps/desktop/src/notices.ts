/**
 * System notifications: something new in the person's notification feed,
 * shown by the operating system only while the window is not in front,
 * since in front the app already shows it; clicking one brings the app
 * forward on the page it names. The words are the web app's, in the
 * person's language; this only checks what crosses the bridge.
 *
 * Do not disturb: Electron exposes no reading of the system's focus modes,
 * but notifications go through the system's own centre (Windows Focus
 * Assist, macOS Focus), which holds them back on its own.
 */

export interface Notice {
  title: string
  body: string
  /** The page in the app a click opens. */
  path: string
}

/** A path inside the app: no other origin, no scheme, nothing to escape with. */
export function isAppPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 1024 &&
    /^\/(?!\/)[A-Za-z0-9/_\-.~?=&%+:]*$/.test(value) &&
    !value.includes('\\')
  )
}

/** A notice from the page, or null when it is not one. */
export function readNotice(value: unknown): Notice | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.title !== 'string' || v.title.trim() === '') return null
  if (typeof v.body !== 'string') return null
  if (!isAppPath(v.path)) return null
  return {
    title: v.title.slice(0, 120),
    body: v.body.slice(0, 300),
    path: v.path,
  }
}

/** Whether to show one now: only when the person is not looking at the app. */
export function shouldNotify(window: { visible: boolean; focused: boolean } | null): boolean {
  return !window || !window.visible || !window.focused
}
