import {
  appOriginsFromEnv,
  createAuth,
  developmentSessionSource,
  PLATFORM_ORG,
  serviceOriginsFromEnv,
  type AppDefinition,
} from '@b2b-template/ui-web'

/**
 * Staff sign-in: the same identity service, admitting only members
 * of the platform org. The server demands a second factor for them. A
 * development build can still take the automatic developer session with
 * VITE_DEV_SESSION=1, for a page worked on without the local stack running.
 */
const auth =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SESSION === '1'
    ? undefined
    : createAuth({
        app: 'platform',
        orgs: [PLATFORM_ORG],
        // The operator's own app: never a support tab, whatever its address.
        support: false,
        ...serviceOriginsFromEnv(import.meta.env),
      })

type PublicPage =
  | 'AcceptInvitePage'
  | 'VerifyEmailPage'
  | 'SetPasswordPage'
  | 'ForgotPasswordPage'
  | 'MfaSetupPage'
  | 'SignInPage'

const publicPage = (name: PublicPage) => () =>
  import('@b2b-template/ui-web').then((m) => ({ default: m[name] }))

export const definition: AppDefinition = {
  app: 'platform',
  navNamespace: 'platform',
  badge: (t) => t('common:appBadge.platform'),
  // Staff are not members of the organizations they look after.
  orgSwitcher: false,
  home: '/organizations',
  signInPath: '/sign-in',
  routes: [
    { path: '/accept-invite', access: 'public', page: publicPage('AcceptInvitePage') },
    { path: '/verify-email', access: 'public', page: publicPage('VerifyEmailPage') },
    { path: '/set-password', access: 'public', page: publicPage('SetPasswordPage') },
    { path: '/reset-password', access: 'public', page: publicPage('SetPasswordPage') },
    { path: '/forgot-password', access: 'public', page: publicPage('ForgotPasswordPage') },
    { path: '/mfa/setup', access: 'public', page: publicPage('MfaSetupPage') },
    {
      path: '/settings/security',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.MfaSettingsPage })),
    },
    {
      path: '/organizations',
      page: () => import('./pages/OrganizationsPage'),
      nav: { key: 'organizations', icon: 'users', label: (t) => t('platform:nav.organizations') },
    },
    { path: '/organizations/new', page: () => import('./pages/CreateOrganizationPage') },
    { path: '/organizations/:orgId', page: () => import('./pages/OrganizationDetailPage') },
    { path: '/sign-in', access: 'public', page: publicPage('SignInPage') },
  ],
  // Where "View as" opens the admin or account app.
  appOrigins: appOriginsFromEnv(import.meta.env),
  sessionSource: auth?.sessionSource ?? developmentSessionSource(import.meta.env.DEV, []),
  ...(auth ? { auth } : {}),
  // From the build's configuration: no DSN on a laptop, so nothing is sent.
  errorTracking: {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT ?? (import.meta.env.DEV ? 'local' : 'production'),
    release: import.meta.env.VITE_RELEASE,
  },
  // The public site key; absent on a laptop, so no widget is loaded and no token sent.
  captcha: { siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY },
}
