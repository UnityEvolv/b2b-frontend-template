import {
  createAuth,
  developmentSessionSource,
  serviceOriginsFromEnv,
  type AppDefinition,
} from '@b2b-template/ui-web'

import { BillingBanner } from './billing/BillingBanner'

/**
 * Sign-in against the identity service. Only an Owner, Admin or
 * Billing Admin may use this app: a plain User with valid credentials is
 * refused and told so. A development build can still take the automatic
 * developer session with VITE_DEV_SESSION=1.
 */
const auth =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SESSION === '1'
    ? undefined
    : createAuth({
        app: 'admin',
        ...serviceOriginsFromEnv(import.meta.env),
        roles: ['owner', 'admin', 'billing_admin'],
      })

export const definition: AppDefinition = {
  app: 'admin',
  navNamespace: 'admin',
  badge: (t) => t('common:appBadge.admin'),
  signupPath: '/signup',
  home: '/users',
  signInPath: '/sign-in',
  banner: BillingBanner,
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
    // Reopening a closing organization from the emailed link.
    {
      path: '/reopen',
      access: 'public',
      page: () => import('./pages/ReopenPage'),
    },
    {
      path: '/signup',
      access: 'public',
      page: () => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })),
    },
    {
      path: '/signup/verify',
      access: 'public',
      page: () => import('./pages/SignupPage').then((m) => ({ default: m.SignupVerifyPage })),
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
    },
    {
      path: '/users',
      page: () => import('./pages/UsersPage'),
      nav: { key: 'users', icon: 'users', label: (t) => t('admin:nav.users') },
    },
    {
      path: '/audit',
      page: () => import('./pages/AuditLogPage'),
      permission: 'audit',
      nav: { key: 'audit', icon: 'file', label: (t) => t('admin:nav.audit') },
    },
    {
      path: '/settings',
      page: () => import('./pages/OrgSettingsPage'),
      permission: 'settings',
      nav: { key: 'settings', icon: 'settings', label: (t) => t('admin:nav.settings') },
    },
    {
      path: '/sso',
      page: () => import('./pages/SsoPage'),
      permission: 'sso',
      nav: { key: 'sso', icon: 'unlock', label: (t) => t('admin:nav.sso') },
    },
    {
      path: '/billing',
      page: () => import('./billing/BillingPage'),
      permission: 'billing',
      nav: { key: 'billing', icon: 'download', label: (t) => t('admin:nav.billing') },
    },
    {
      path: '/scim',
      page: () => import('./scim/ScimPage'),
      permission: 'settings',
      nav: { key: 'scim', icon: 'invite', label: (t) => t('admin:nav.scim') },
    },
    {
      path: '/api-keys',
      page: () => import('./pages/ApiKeysPage'),
      permission: 'api_keys',
      nav: { key: 'api-keys', icon: 'external-link', label: (t) => t('admin:nav.apiKeys') },
    },
    {
      path: '/roles',
      page: () => import('./pages/RolesPage'),
      permission: 'configure_permissions',
      nav: { key: 'roles', icon: 'lock', label: (t) => t('admin:nav.roles') },
    },
    {
      path: '/users/invite',
      page: () => import('./pages/InviteUsersPage'),
      permission: 'users',
    },
    {
      path: '/users/import',
      page: () => import('./pages/ImportUsersPage'),
      permission: 'users',
    },
    {
      path: '/users/:membershipId',
      page: () => import('./pages/UserDetailPage'),
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
