import {
  createAuth,
  developmentSessionSource,
  serviceOriginsFromEnv,
  type AppDefinition,
} from '@b2b-template/ui-web'

import { NotificationBell } from './notify/NotificationBell'

/**
 * Sign-in against the identity service. A development build can still take
 * the automatic developer session with VITE_DEV_SESSION=1, for a page worked
 * on without the local stack running.
 */
const auth =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SESSION === '1'
    ? undefined
    : createAuth({ app: 'account', ...serviceOriginsFromEnv(import.meta.env) })

export const definition: AppDefinition = {
  app: 'account',
  navNamespace: 'account',
  accountMenu: [
    { key: 'profile', icon: 'settings', path: '/profile', label: (t) => t('common:profileLink') },
    {
      key: 'notifications',
      icon: 'bell',
      path: '/settings/notifications',
      label: (t) => t('common:notificationsLink'),
    },
    {
      key: 'tokens',
      icon: 'external-link',
      path: '/settings/tokens',
      label: (t) => t('account:nav.tokens'),
    },
  ],
  home: '/profile',
  signInPath: '/sign-in',
  headerActions: NotificationBell,
  routes: [
    {
      path: '/accept-invite',
      access: 'public',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.AcceptInvitePage })),
    },
    {
      path: '/verify-email',
      access: 'public',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.VerifyEmailPage })),
    },
    {
      path: '/set-password',
      access: 'public',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.SetPasswordPage })),
    },
    {
      path: '/reset-password',
      access: 'public',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.SetPasswordPage })),
    },
    {
      path: '/forgot-password',
      access: 'public',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.ForgotPasswordPage })),
    },
    {
      path: '/mfa/setup',
      access: 'public',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.MfaSetupPage })),
    },
    {
      path: '/settings/security',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.MfaSettingsPage })),
      nav: { key: 'security', icon: 'lock', label: (t) => t('account:nav.security') },
    },
    {
      path: '/profile',
      page: () => import('./pages/ProfilePage'),
      nav: { key: 'profile', icon: 'settings', label: (t) => t('account:nav.profile') },
    },
    // The links an email change sends: confirm, and undo within the hour.
    {
      path: '/confirm-email-change',
      access: 'public',
      page: () => import('./pages/EmailChangePage'),
    },
    { path: '/undo-email-change', access: 'public', page: () => import('./pages/EmailChangePage') },
    // Notification preferences, where an email's unsubscribe link lands.
    {
      path: '/settings/notifications',
      page: () => import('./pages/NotificationsPage'),
      nav: { key: 'notifications', icon: 'bell', label: (t) => t('account:nav.notifications') },
    },
    // The person's own personal access tokens in the org they are in.
    {
      path: '/settings/tokens',
      page: () => import('./pages/TokensPage'),
      nav: { key: 'tokens', icon: 'external-link', label: (t) => t('account:nav.tokens') },
    },
    {
      path: '/sign-in',
      access: 'public',
      page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.SignInPage })),
    },
  ],
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
