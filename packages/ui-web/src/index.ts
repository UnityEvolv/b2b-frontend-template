/**
 * @b2b-template/ui-web
 *
 * The frame every page in the three web apps renders inside. A new page
 * declares a route and writes the page; sign-in, permissions, the layout,
 * theme, language, loading, errors and toasts are already here.
 */
export { startApp, AppProviders } from './start'
export {
  useApp,
  type AccountMenuEntry,
  type AppDefinition,
  type AppName,
  type AppRoute,
  type Namespace,
  type NavT,
} from './app'
export { buildRoutes, RequireOutsideSupport, RequirePermission, RequireSignIn } from './routing'
export { AppLayout } from './layout'
export {
  ForbiddenPage,
  NotFoundPage,
  PageLoading,
  RouteErrorPage,
  SignInPendingPage,
  UnsupportedBrowserPage,
} from './pages'
export {
  memorySessionSource,
  SessionProvider,
  useSession,
  type Preferences,
  type Session,
  type SessionSource,
  type SessionState,
  type SessionUser,
} from './session'
export { DARK_QUERY, THEME_CACHE_KEY, ThemeProvider, useTheme } from './theme'
export { developmentSessionSource } from './dev-session'
/** Sign-in and the session behind it: the identity service's source, and the page. */
export {
  createAuth,
  serviceOrigins,
  SignInRefused,
  type Auth,
  type AuthOptions,
  type SignInClient,
} from './auth'
export { SignInPage, safeNext } from './sign-in'
/** The desktop shell's bridge, present only inside the desktop app. */
export {
  desktopBridge,
  readDesktopPath,
  readDesktopSignIn,
  type DesktopBridge,
  type DesktopNotice,
  type DesktopSignIn,
} from './desktop'
export { appOriginsFromEnv, serviceOriginsFromEnv } from './env'
/** A path in another web app, at its configured origin. */
export { appLink, useAppLink, type AppLink } from './app-links'
/** Support mode: a platform operator seeing an org as one of its people, read-only. */
export {
  forgetSupportRequest,
  SUPPORT_PARAM,
  SupportBanner,
  SupportEndedPage,
  supportRequested,
  SupportUnavailablePage,
  useReadOnly,
  useSupport,
  type SupportEnvironment,
} from './support'
export {
  IMPERSONATION_ENDED,
  IMPERSONATION_READ_ONLY,
  type SessionImpersonation,
  type SupportControl,
  type SupportEnd,
} from '@b2b-template/client'
/** The pages around sign-in. */
export {
  AcceptInvitePage,
  ForgotPasswordPage,
  maskEmail,
  SetPasswordPage,
  VerifyEmailPage,
} from './account-pages'
export { MfaSettingsPage, MfaSetupPage } from './mfa-pages'
export { PublicCard } from './public-card'
export { Brand, type BrandProps, type BrandSize } from './brand'
export { OrgSwitcher, type OrgChoice } from './org-switcher'
/** Live session events: the shell answers the core's; a product listens for its own. */
export { LiveSessionProvider, useLiveEvent } from './live'
export {
  CORE_LIVE_EVENTS,
  type LiveEvent,
  type LiveEventType,
  type LiveEventTypes,
  type LiveHandler,
} from '@b2b-template/client'
export { createAccountClient, type AccountClient } from './account'
export { I18nProvider } from './i18n'
export { missingCapabilities, type Capability, type CapabilityEnvironment } from './capabilities'
export { pickThemed, type Theme, type ThemePreference } from '@b2b-template/theme'
/** Success and failure messages, from anywhere. The surface is mounted by the shell. */
export { toast } from '@unityevolv/unitykit'
export {
  initErrorTracking,
  reportError,
  setErrorTrackingUser,
  type ErrorTrackingConfig,
} from './error-tracking'
/** Bot protection for public forms: a token per action, sent in `CAPTCHA_HEADER`. */
export {
  CAPTCHA_HEADER,
  CaptchaNotice,
  useCaptcha,
  type CaptchaAction,
  type CaptchaConfig,
} from './captcha'

/** The typed API and the org the session is in, for a page inside one org. */
export {
  assignableRoles,
  mayInvite,
  mayManage,
  MEMBERSHIP_STATUSES,
  ORG_ROLES,
  PLATFORM_ORG,
  useOrg,
  type OrgContext,
} from './org'

/** API keys and personal access tokens: the list, making one (its token shown once) and revoking. */
export {
  ApiKeysPanel,
  grantableGroups,
  keyState,
  NEVER_GRANTED,
  newKeyRequest,
  type ApiKey,
  type ApiKeyKind,
  type NewKeyError,
  type NewKeyForm,
} from './api-keys'

/** The notification categories the deployment registers, for the preferences grids. */
export {
  channelsIn,
  CHOICE_CHANNELS,
  useNotificationCategories,
  withChoice,
  type ChannelChoice,
  type ChoiceChannel,
  type NotificationCategory,
} from './notification-categories'

/** The plan catalogue and the org's plan, read from the organization service when a page opens. */
export {
  bandLabel,
  planFeatures,
  planLimits,
  planOverride,
  sentenceCase,
  useOrganizationPlan,
  usePlanCatalogue,
  withdrawnFeatures,
  type OrganizationPlan,
  type PlanBand,
  type PlanCatalogue,
  type PlanLimitRow,
  type PlanOverride,
} from '@b2b-template/client'
