import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useApp } from './app'
import { desktopBridge, readDesktopPath, readDesktopSignIn } from './desktop'
import { useSession } from './session'

/**
 * What the desktop shell asks of the page: open a page a link into the app
 * named, finish a sign-in that happened in the browser, and sign out when the
 * tray asks. Inside the router, so a link moves within the app rather than
 * loading the page again. Renders nothing in a browser.
 */
export function DesktopLinks() {
  const { auth, signInPath } = useApp()
  const { reload, signOut } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    const bridge = desktopBridge()
    if (!bridge) return
    const offs: Array<() => void> = []
    // Both listen before the shell is told the page is ready, in this one
    // turn, so whatever it kept for the page reaches the right listener.
    if (bridge.onNavigate) {
      offs.push(
        bridge.onNavigate((value) => {
          const path = readDesktopPath(value)
          if (path) void navigate(path)
        }),
      )
    }
    if (bridge.onSignIn) {
      offs.push(
        bridge.onSignIn((value) => {
          const result = readDesktopSignIn(value)
          if (!result) return
          const back = (error: string) =>
            void navigate(
              `${signInPath}?error=${encodeURIComponent(error)}&next=${encodeURIComponent(result.next)}`,
              { replace: true },
            )
          if ('error' in result) {
            back(result.error)
            return
          }
          if (!auth) return
          auth.signIn.exchange(result.code, result.verifier).then(
            () => {
              reload()
              void navigate(result.next, { replace: true })
            },
            () => back('exchange_invalid'),
          )
        }),
      )
    }
    if (bridge.onSignOut) offs.push(bridge.onSignOut(() => void signOut()))
    return () => {
      for (const off of offs) off()
    }
  }, [auth, navigate, reload, signInPath, signOut])

  return null
}

/** The route tree's root: the desktop's listener beside every page. */
export function DesktopRoot() {
  return (
    <>
      <DesktopLinks />
      <Outlet />
    </>
  )
}
