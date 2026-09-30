import type { IconName } from '@unityevolv/unitykit'
import type { ProductLocales, Resources } from '@b2b-template/i18n'
import type { TFunction } from 'i18next'
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

import type { Auth, SignedOutReason } from './auth'
import type { Capability } from './capabilities'
import type { CaptchaConfig } from './captcha'
import type { ErrorTrackingConfig } from './error-tracking'
import type { SessionSource } from './session'

/**
 * An app's name: the tag its errors carry and the key of its title. The
 * template's apps are account, admin and platform; a product adds its own.
 */
export type AppName = string

/** A translation namespace. */
export type Namespace = keyof Resources

/**
 * The translation function a nav or menu label gets: every namespace, so a
 * label names its key with its prefix and the compiler checks it,
 * `(t) => t('admin:nav.users')`.
 */
export type NavT = TFunction<Namespace[]>

/** An entry in the account menu, under the person's name. */
export interface AccountMenuEntry {
  key: string
  icon?: IconName
  path: string
  label: (t: NavT) => string
}

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
  /** The namespace this app's own strings, its nav labels among them, are in. */
  navNamespace: Namespace
  /**
   * A product's own namespaces, declared on `ProductResources` in
   * `@b2b-template/i18n`: added beside the template's when the app starts.
   * None by default; the template's apps keep their strings in the i18n
   * package.
   */
  locales?: ProductLocales
  /** Pages the account menu offers besides the theme and signing out. None by default. */
  accountMenu?: AccountMenuEntry[]
  /** A badge beside the brand, naming a secondary app such as admin. None by default. */
  badge?: (t: NavT) => string
  /** Whether the header offers switching organization. On by default. */
  orgSwitcher?: boolean
  /** Where the sign-in page offers to create an organization, if this app does. */
  signupPath?: string
  /**
   * What the browser must be able to do before this app loads. None by
   * default: the check only runs for what an app declares it needs.
   */
  capabilities?: Capability[]
  routes: AppRoute[]
  /** Where `/` and the brand link go once signed in. */
  home: string
  /** Where a signed-out visitor is sent, with `?next=` set to where they were going. */
  signInPath: string
  sessionSource: SessionSource
  /** Sign-in and the API behind the session. Absent for a development session. */
  auth?: Auth & { reason(): SignedOutReason | null }
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
  | 'navNamespace'
  | 'accountMenu'
  | 'badge'
  | 'orgSwitcher'
  | 'signupPath'
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
