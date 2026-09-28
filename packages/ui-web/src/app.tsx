import type { IconName } from '@unityevolv/unitykit'
import type { TFunction } from 'i18next'
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

import type { Auth } from './auth'
import type { CaptchaConfig } from './captcha'
import type { ErrorTrackingConfig } from './error-tracking'
import type { SessionSource } from './session'

export type AppName = 'account' | 'admin' | 'platform'

/** Every namespace, so a nav label can name any app's key with its prefix. */
export const NAV_NAMESPACES = ['common', 'account', 'admin', 'platform'] as const
export type NavT = TFunction<typeof NAV_NAMESPACES>

/**
 * One page, declared.
 *
 * Adding a page is adding one of these: auth, layout, theme, errors and the
 * navigation entry come with it. The component is loaded when the route is
 * first visited, so a page nobody opens costs nothing.
 */
export interface AppRoute {
  /** Absolute, such as `/users` or `/users/:id`. */
  path: string
  page: () => Promise<{ default: ComponentType }>
  /** Signed-in by default. Public routes render without the layout. */
  access?: 'signed-in' | 'public'
  /**
   * A permission the server must have granted, or a list of which any one
   * will do. Without it: the 403 page, and no nav entry.
   */
  permission?: string | string[]
  nav?: {
    key: string
    icon?: IconName
    /** A function of `t`, so the key is checked by the compiler: `(t) => t('admin:nav.users')`. */
    label: (t: NavT) => string
  }
}

export interface AppDefinition {
  app: AppName
  routes: AppRoute[]
  /** Where `/` and the brand link go once signed in. */
  home: string
  /** Where a signed-out visitor is sent, with `?next=` set to where they were going. */
  signInPath: string
  sessionSource: SessionSource
  /** Sign-in and the API behind the session (UO-63). Absent for a development session. */
  auth?: Auth & { reason(): 'not_admin' | 'not_staff' | null }
  /** Where unhandled errors go. From the build's configuration; absent on a laptop. */
  errorTracking?: ErrorTrackingConfig
  /** The public CAPTCHA site key for public forms. From the build's configuration; absent on a laptop. */
  captcha?: CaptchaConfig
  /**
   * Controls this app adds to the header, beside the org switcher: the
   * account app's notification bell. Shared pages never need to know what is
   * there.
   */
  headerActions?: ComponentType
  /**
   * A notice above every page's content, for this app's own reasons: the
   * admin app's billing banners. It renders nothing when there is nothing
   * to say.
   */
  banner?: ComponentType
  /**
   * What wraps every signed-in page and outlives moving between them: state
   * an app keeps across pages, such as a live connection. The default shell
   * is the layout alone.
   */
  shell?: ComponentType<{ children: ReactNode }>
}

type AppContextValue = Pick<
  AppDefinition,
  | 'app'
  | 'home'
  | 'signInPath'
  | 'routes'
  | 'captcha'
  | 'auth'
  | 'headerActions'
  | 'banner'
  | 'shell'
>

const AppContext = createContext<AppContextValue | null>(null)
export const AppProvider = AppContext.Provider

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp is used outside AppProvider')
  return value
}

/** Whether a route's permission, or any one of a list, is held. */
export function granted(
  permissions: { can(p: string): boolean },
  permission: string | string[],
): boolean {
  return typeof permission === 'string'
    ? permissions.can(permission)
    : permission.some((p) => permissions.can(p))
}
