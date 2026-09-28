import {
  AppShell,
  Avatar,
  Badge,
  Brand,
  Dropdown,
  Navbar,
  Progress,
  Sidebar,
  toast,
  type SidebarItem,
} from '@unityevolv/unitykit'
import { displayName } from '@b2b-template/core'
import { THEME_PREFERENCES, type ThemePreference } from '@b2b-template/theme'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate, useNavigation } from 'react-router'

import { granted, NAV_NAMESPACES, useApp, type AppRoute } from './app'
import { OrgSwitcher } from './org-switcher'
import { PageLoading } from './pages'
import { useSession } from './session'
import { useTheme } from './theme'

/** A sidebar row: the kit's menu item look, from tokens, keyed off aria-current. */
const SIDEBAR_LINK = [
  'flex w-full items-center gap-2 rounded-field px-3 py-2 text-sm',
  'hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary',
  'aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary',
].join(' ')

/** Whether a nav entry owns the current path: itself, or anything beneath it. */
function owns(route: AppRoute, pathname: string) {
  return pathname === route.path || pathname.startsWith(`${route.path}/`)
}

function UserMenu() {
  const { t } = useTranslation()
  const { app } = useApp()
  const navigate = useNavigate()
  const { state, signOut } = useSession()
  const { preference, setPreference } = useTheme()
  if (state.status !== 'signed-in') return null

  const { user } = state.session
  const name = displayName(user)

  const choose = (next: ThemePreference) => {
    setPreference(next).catch(() => toast.warning(t('theme.saveFailed')))
  }

  return (
    <Dropdown
      align="end"
      trigger={
        <button
          type="button"
          className="btn btn-ghost btn-circle"
          aria-label={t('userMenu', { name })}
        >
          <Avatar name={name} src={user.photoUrl ?? undefined} size="sm" />
        </button>
      }
    >
      <Dropdown.Label>{name}</Dropdown.Label>
      {app === 'account' && (
        <Dropdown.Item icon="settings" onSelect={() => void navigate('/profile')}>
          {t('profileLink')}
        </Dropdown.Item>
      )}
      {app === 'account' && (
        <Dropdown.Item icon="bell" onSelect={() => void navigate('/settings/notifications')}>
          {t('notificationsLink')}
        </Dropdown.Item>
      )}
      <Dropdown.Separator />
      <Dropdown.Label>{t('theme.label')}</Dropdown.Label>
      {THEME_PREFERENCES.map((option) => (
        <Dropdown.Item
          key={option}
          icon={option === preference ? 'check' : undefined}
          hint={
            option === preference ? (
              <span className="sr-only">{t('theme.current')}</span>
            ) : undefined
          }
          onSelect={() => choose(option)}
        >
          {t(`theme.${option}`)}
        </Dropdown.Item>
      ))}
      <Dropdown.Separator />
      <Dropdown.Item icon="log-out" onSelect={() => void signOut()}>
        {t('signOut')}
      </Dropdown.Item>
    </Dropdown>
  )
}

/**
 * The frame every signed-in page renders inside: unitykit's shell, the brand,
 * the navigation the person is allowed to see, and the account menu.
 */
export function AppLayout() {
  const { t } = useTranslation()
  const { t: navT } = useTranslation(NAV_NAMESPACES)
  const { app, home, routes, headerActions: HeaderActions, banner: Banner, shell: Shell } = useApp()
  const { permissions } = useSession()
  const { pathname } = useLocation()
  const navigation = useNavigation()

  const visible = routes.filter(
    (route) => route.nav && (!route.permission || granted(permissions, route.permission)),
  )
  const items: SidebarItem[] = visible.map((route) => ({
    key: route.nav!.key,
    label: route.nav!.label(navT),
    icon: route.nav!.icon,
    href: route.path,
  }))
  const activeRoute = visible.find((route) => owns(route, pathname))
  const active = activeRoute?.nav?.key

  const page = (
    <>
      <a
        href="#content"
        className="btn btn-primary fixed inset-s-2 top-2 z-50 translate-y-[-200%] focus:translate-y-0 motion-safe:transition-transform"
      >
        {t('skipToContent')}
      </a>
      <AppShell
        sidebarTitle={t('navigation')}
        navbar={
          <Navbar
            brand={
              <Link to={home} className="flex items-center gap-2">
                <Brand product="unityofis" size="sm" />
                {app !== 'account' && <Badge variant="secondary">{t(`appBadge.${app}`)}</Badge>}
              </Link>
            }
            actions={
              <div className="flex items-center gap-2">
                {HeaderActions && <HeaderActions />}
                <OrgSwitcher />
                <UserMenu />
              </div>
            }
          />
        }
        sidebar={
          <Sidebar
            items={items}
            activeKey={active}
            label={t('navigation')}
            // unitykit wraps a linked item in a `display: contents` span and puts
            // aria-current on that span. The menu styles and the screen reader
            // both miss the link inside it, so the link carries both here until
            // the kit is fixed.
            renderLink={({ href, children }) => (
              <Link
                to={href}
                className={SIDEBAR_LINK}
                aria-current={href === activeRoute?.path ? 'page' : undefined}
              >
                {children}
              </Link>
            )}
          />
        }
      >
        {navigation.state === 'loading' && (
          <Progress className="fixed inset-x-0 top-0 z-50 h-1" aria-label={t('loading')} />
        )}
        <div id="content" tabIndex={-1} className="p-4 outline-none sm:p-6">
          {Banner && <Banner />}
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </div>
      </AppShell>
    </>
  )
  return Shell ? <Shell>{page}</Shell> : page
}
