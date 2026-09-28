import { Toaster, TooltipProvider } from '@unityevolv/unitykit'
import { createI18n } from '@b2b-template/i18n'
import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import { AppProvider, type AppDefinition } from './app'
import { initErrorTracking, setErrorTrackingUser } from './error-tracking'
import { missingCapabilities, type CapabilityEnvironment } from './capabilities'
import { I18nProvider, initialLanguage } from './i18n'
import { UnsupportedBrowserPage } from './pages'
import { buildRoutes } from './routing'
import { SessionProvider, useSession } from './session'
import { ThemeProvider } from './theme'

/** Tells error tracking who is signed in, by id only. */
function ErrorTrackingUser() {
  const { state } = useSession()
  const userId = state.status === 'signed-in' ? state.session.user.id : null
  useEffect(() => setErrorTrackingUser(userId), [userId])
  return null
}

/**
 * Everything a page needs around it, in one place.
 *
 * Exported so tests can render a page inside exactly what the app renders it
 * inside, with a memory router instead of the browser's.
 */
export function AppProviders({
  definition,
  i18n,
  children,
}: {
  definition: AppDefinition
  i18n: ReturnType<typeof createI18n>
  children: ReactNode
}) {
  const {
    app,
    home,
    signInPath,
    routes,
    sessionSource,
    captcha,
    auth,
    headerActions,
    banner,
    shell,
  } = definition
  return (
    <AppProvider
      value={{ app, home, signInPath, routes, captcha, auth, headerActions, banner, shell }}
    >
      <SessionProvider source={sessionSource}>
        <ErrorTrackingUser />
        <I18nProvider i18n={i18n}>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </SessionProvider>
    </AppProvider>
  )
}

/**
 * Start a web app.
 *
 * Checks the browser first and shows the plain unsupported page if it cannot
 * run the office, rather than letting it fail somewhere inside. Otherwise
 * renders the route tree inside the providers.
 */
export function startApp(definition: AppDefinition, container: HTMLElement) {
  initErrorTracking(definition.app, definition.errorTracking)
  const i18n = createI18n(initialLanguage())
  document.title = i18n.t(`appName.${definition.app}`)
  const root = createRoot(container)

  const missing = missingCapabilities(window as unknown as CapabilityEnvironment)
  if (missing.length > 0) {
    root.render(
      <StrictMode>
        <AppProviders definition={definition} i18n={i18n}>
          <UnsupportedBrowserPage missing={missing} />
        </AppProviders>
      </StrictMode>,
    )
    return
  }

  const router = createBrowserRouter(buildRoutes(definition))
  root.render(
    <StrictMode>
      <AppProviders definition={definition} i18n={i18n}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}
