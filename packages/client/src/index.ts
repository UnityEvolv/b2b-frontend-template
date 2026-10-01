/**
 * @b2b-template/client
 *
 * What the web apps and the phone share above the typed API. The session and
 * the provider that renders from it, sign-in, the account flows, and the
 * tables that turn a refusal into a sentence. No DOM: a platform passes in
 * its cache and, on the phone, where the session cookie is kept.
 */
export {
  CAPTCHA_HEADER,
  createAuth,
  serviceOrigins,
  type AccessToken,
  type Auth,
  type AuthApp,
  type AuthOptions,
  type Cache,
  type LocalSignInResult,
  type MfaStep,
  type SignInClientKind,
  type OrgChoice,
  type SignedOutReason,
  type SignInClient,
} from './auth'
export {
  backoffDelay,
  CORE_LIVE_EVENTS,
  openLiveSession,
  type CoreLiveEventType,
  type EventSourceFactory,
  type EventSourceLike,
  type LiveEvent,
  type LiveEventType,
  type LiveEventTypes,
  type LiveHandler,
  type LiveSession,
  type LiveSessionOptions,
} from './live'
export {
  createAccountClient,
  type AccountClient,
  type AccountClientOptions,
  type EmailVerified,
  type InviteAccepted,
  type InvitePreview,
  type MfaStatus,
  type TotpEnrolment,
} from './account'
export {
  cookieFrom,
  memoryCookieStore,
  SESSION_COOKIE,
  splitSetCookie,
  type SessionCookieStore,
} from './cookies'
export {
  CALLBACK_ERRORS,
  FORGOT_ERRORS,
  INVITE_ERRORS,
  MFA_ERRORS,
  PASSWORD_ERRORS,
  refusalKey,
  SIGN_IN_ERRORS,
  SignInRefused,
  VERIFY_ERRORS,
} from './errors'
export { afterLeaving, canSwitch, leaveBlocked } from './orgs'
export {
  maskEmail,
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordAcceptable,
  passwordRules,
  safeNext,
  type PasswordRule,
} from './password'
export {
  DAYS,
  deviceTimeZone,
  DIRECTORY_FIELDS,
  LANGUAGES,
  matchTimeZones,
  THEMES,
  timeZones,
  workingHours,
  type Day,
} from './profile'
export {
  memorySessionSource,
  SessionProvider,
  useSession,
  type Preferences,
  type Session,
  type SessionContextValue,
  type SessionMembership,
  type SessionSource,
  type SessionState,
  type SessionUser,
} from './session'
export {
  categoryOf,
  feedWords,
  useNotificationCategories,
  type FeedEntry,
  type FeedWords,
  type NotificationCategory,
} from './notifications'
export {
  bandLabel,
  planFeatures,
  planLimits,
  sentenceCase,
  useOrganizationPlan,
  usePlanCatalogue,
  type OrganizationPlan,
  type PlanBand,
  type PlanCatalogue,
  type PlanLimitRow,
} from './plans'
