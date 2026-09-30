import { Navigate, Outlet, useLocation, type RouteObject } from 'react-router'

import { granted, type AppDefinition, type AppRoute } from './app'
import { DesktopRoot } from './desktop-links'
import { AppLayout } from './layout'
import { ForbiddenPage, NotFoundPage, PageLoading, RouteErrorPage, SessionErrorPage } from './pages'
import { useSession } from './session'

/** Signed-out visitors go to sign-in, and come back to where they were going. */
export function RequireSignIn({ signInPath }: { signInPath: string }) {
  const { state } = useSession()
  const location = useLocation()

  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <SessionErrorPage onRetry={state.retry} />
  if (state.status === 'signed-out') {
    const next = encodeURIComponent(location.pathname + location.search + location.hash)
    return <Navigate to={`${signInPath}?next=${next}`} replace />
  }
  return <Outlet />
}

/**
 * Signed in but not allowed: the 403 page, in the layout, so the rest of the
 * app is still one click away. Hiding is a courtesy; the API refuses anyway.
 */
export function RequirePermission({ permission }: { permission: string | string[] }) {
  const { permissions } = useSession()
  return granted(permissions, permission) ? <Outlet /> : <ForbiddenPage />
}

const lazyPage = (route: AppRoute): Pick<RouteObject, 'path' | 'lazy'> => ({
  path: route.path,
  lazy: async () => ({ Component: (await route.page()).default }),
})

/**
 * The whole route tree, from the app's page list.
 *
 * Public pages render bare. Everything else sits behind sign-in, inside the
 * layout, behind its permission if it has one. `/` goes home, and anything
 * unknown is a 404 inside the layout.
 */
export function buildRoutes({
  routes,
  home,
  signInPath,
}: Omit<AppDefinition, 'app' | 'sessionSource'>) {
  const open = routes.filter((route) => route.access === 'public')
  const guarded = routes.filter((route) => route.access !== 'public')

  const tree: RouteObject[] = [
    {
      // Links into the desktop app, and its sign-in in the browser.
      element: <DesktopRoot />,
      errorElement: <RouteErrorPage />,
      hydrateFallbackElement: <PageLoading />,
      children: [
        ...open.map(lazyPage),
        {
          element: <RequireSignIn signInPath={signInPath} />,
          children: [
            {
              element: <AppLayout />,
              children: [
                { index: true, element: <Navigate to={home} replace /> },
                ...guarded.map((route) =>
                  route.permission
                    ? {
                        element: <RequirePermission permission={route.permission} />,
                        children: [lazyPage(route)],
                      }
                    : lazyPage(route),
                ),
                { path: '*', element: <NotFoundPage /> },
              ],
            },
          ],
        },
      ],
    },
  ]
  return tree
}
