/**
 * The shell's decisions that need no Electron: where the window may go, and
 * the headers the packaged app is served with. Pure, so they are tested.
 */

export type NavigationDecision = 'allow' | 'open-externally' | 'deny'

/**
 * The window shows the app and nothing else. A link to anywhere else opens
 * in the person's browser; anything that is not http(s) is dropped.
 *
 * @param url Where a navigation or a new window wants to go.
 * @param appOrigins The origins the app itself is served from: the packaged
 * origin, and in development the dev server.
 */
export function navigationDecision(url: string, appOrigins: string[]): NavigationDecision {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return 'deny'
  }
  if (appOrigins.includes(originOf(target))) return 'allow'
  if (target.protocol === 'http:' || target.protocol === 'https:') return 'open-externally'
  return 'deny'
}

/**
 * scheme://host[:port]. `URL.origin` is "null" for a scheme the platform
 * does not know, and the app's own scheme is one of those.
 */
function originOf(url: URL): string {
  return `${url.protocol}//${url.host}`
}

/**
 * The production security headers, from the same definition the web build is
 * served with, with the deploy-time placeholders filled in. The shell knows
 * only the API's origin; every other placeholder, and the API's when it is
 * not configured, is dropped rather than left in the policy, so the shell
 * reaches nothing beyond itself that it was not told of.
 */
export function securityHeaders(
  headers: Record<string, string>,
  origins: { api?: string },
): Record<string, string> {
  const fill = (value: string) =>
    value
      .replace(/\s*__API_ORIGIN__/g, origins.api ? ` ${origins.api}` : '')
      .replace(/\s*__[A-Z_]+_ORIGIN__/g, '')
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers)) {
    // Transport security is the browser's concern over https; inside the
    // shell every page is served from the app scheme.
    if (name === 'Strict-Transport-Security') continue
    out[name] = fill(value)
  }
  return out
}

/** The content type a served file is announced with, by extension. */
export function contentType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json',
    '.txt': 'text/plain; charset=utf-8',
  }
  return types[ext] ?? 'application/octet-stream'
}

/**
 * The file a request for a path in the packaged app resolves to, or null
 * when the path escapes the web root. A path with no file behind it is the
 * app's index, so client-side routes deep-link.
 */
export function resolveAppPath(
  pathname: string,
  exists: (relative: string) => boolean,
): string | null {
  const decoded = decodeURIComponent(pathname)
  const parts = decoded.split('/').filter((p) => p !== '' && p !== '.')
  if (parts.some((p) => p === '..')) return null
  const relative = parts.join('/')
  if (relative !== '' && exists(relative)) return relative
  return 'index.html'
}
