import { useApp } from './app'

/**
 * Where a path in a web app is, from this one: a route here, an address in
 * another app at its configured origin, or nowhere when that app has no
 * origin in this build.
 */
export type AppLink = { kind: 'route'; to: string } | { kind: 'url'; href: string } | null

/** Only a path is followed: never an address, never a protocol-relative one. */
const isPath = (href: string) => href.startsWith('/') && !href.startsWith('//')

export function appLink(
  app: string,
  href: string,
  here: string,
  origins: Readonly<Record<string, string>> = {},
): AppLink {
  if (!isPath(href)) return null
  if (app === here) return { kind: 'route', to: href }
  const origin = origins[app]
  return origin ? { kind: 'url', href: `${origin}${href}` } : null
}

/** `appLink` from the app this page is in, with its configured origins. */
export function useAppLink(app: string, href: string): AppLink {
  const { app: here, appOrigins } = useApp()
  return appLink(app, href, here, appOrigins)
}
