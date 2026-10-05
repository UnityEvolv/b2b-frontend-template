# Security

What the frontend does for security, and what a product changes. The
backend's half (per-organization envelope encryption, rate limits, sessions,
single sign-on hardening, the API's own headers, no personal data in logs) is
in the backend's
[security.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/security.md).

To report a vulnerability, see [SECURITY.md](../SECURITY.md). Please do not
open a public issue.

## Anything the UI disables, the API refuses

The web apps hide menu entries, routes and controls a person cannot use:
a route's `permission` shows the 403 page, `useSession().permissions.can()`
hides a button, an app's `roles` keeps members out of the admin app. None of
that is a security boundary. Every service checks the permission, the role
and the plan's limits on every request, and the pages show the refusal when
it comes (a 403 with `{ code, message }`). A change to the frontend can never
grant access; a page that forgot a check only shows a button that fails.

## UI gates

The rule the other way round: anything the UI offers, the person may do.
Each gate below asks the same permission the backend checks, from the
session's permissions (`can`), the org role (`mayManage`, `mayInvite`,
`assignableRoles` in `@b2b-template/ui-web`, which mirror `authz.MayManage`),
or the app's sign-in (`roles`, `orgs`). Refusals that depend on data rather
than on who is asking (the last Owner, the plan's cap or features, a taken
domain) are left to the server and shown in its words.

Groups: `users`, `audit`, `sso`, `api_keys`, `webhooks` (Admin by default), `billing` (Billing
Admin by default), `settings` (Owner and Admin, fixed), and the Owner-only
`assign_roles`, `configure_permissions`, `transfer_ownership`,
`delete_organization`, `claim_domain`. An Owner holds them all.

**Admin app** (sign-in admits Owner, Admin and Billing Admin)

| control or route | backend check | UI gate |
| --- | --- | --- |
| Users nav, `/users` list | user `ListMemberships`: a member of the org | none (every role the app admits) |
| Invite people, Import from a sheet (Users page, empty state) | identity `CreateInvite`: `users` and `MayManage(role, invitee)`; user `ImportUsers`, `ReadImportColumns`: `users`, each row's role `MayManage` (a blank role is a User and checked too; a refused row is `failed`, `role_invalid`) | `mayInvite`: `can('users')` and a role that may hand one out; the invite role select and the import's role help name `assignableRoles` only; a refused row shows in the server's words |
| `/users/invite`, `/users/import` | as above; `ListInvites`: `users` (or the inviter) | route `permission: 'users'`; both pages refuse a role with no `assignableRoles` |
| Resend, Withdraw (each pending invite) | identity `ResendInvite`, `RevokeInvite`: `users` and `MayManage(role, invite's role)`, or the member who sent it | per row: `can('users')` and `mayManage(role, invite.role)`, or `invited_by_membership_id` is one's own |
| `/users/:id` | user `GetMembership`: a member of the org | none |
| Role select | authorization `SetRole`: `assign_roles` (Owner); not on oneself | `can('assign_roles')`, disabled on one's own membership and on a guest |
| Deactivate, Reactivate | user `SetMembershipStatus`: `users` and `MayManage(role, target)` | `can('users')` and `mayManage(role, target)` |
| Reset two-step sign-in | identity `ResetMemberMfa`: `users` and `MayManage(role, target)` (an Owner anyone, themselves included; an Admin not themselves) | `can('users')` and `mayManage(role, target)` |
| Sessions card, Sign out everywhere | identity `ListMemberSessions`, `RevokeMemberSessions`: `users` and `MayManage(role, target)` | `can('users')` and `mayManage(role, target)`; the sessions are not asked for otherwise |
| Activity card | audit `ListAuditEvents`: `audit` | `can('audit')` |
| Audit log nav, `/audit`, export | audit list and export: `audit` | route `permission: 'audit'` |
| Settings nav, `/settings`: general, the domain claim (read), session policy | organization `UpdateOrganization`, `GetDomain`, identity `SetSessionPolicy`: `settings` | route `permission: 'settings'` |
| Claim, Verify now (domain) | organization `SetDomain`, `VerifyDomain`: `claim_domain` (the Owner; or a platform operator) | `can('claim_domain')`; an Admin sees the claim and its record, no action |
| Single sign-on nav, `/sso`: identity provider (OpenID Connect or SAML) test, save; the SAML service provider's details | identity provider endpoints, `GetSamlServiceProvider`: `sso` | route `permission: 'sso'`; Save only after a passing test of the values as they are |
| Require single sign-on for the domain (on `/sso`) | identity `SetSsoEnforcement`: the Owner role only (never an Admin, a platform operator or a support session); on only while the provider is active and verified (409 `identity_provider.not_verified`) | `role === 'owner'`, else disabled with why; turning it on also needs `status === 'active'` and `verified_at`; a 409 is explained ([sso.md](sso.md)) |
| Notification defaults | notification `SetOrgNotificationSettings`: `settings` and the Owner role | `role === 'owner'` |
| Exports, Close organization | organization `CreateOrgExport`, `ListOrgExports`: `delete_organization` as Owner; `CloseOrganization`: `delete_organization` | `role === 'owner'` |
| Billing nav, `/billing`: card, band, trial, cancel pending; the banner; limits and features set by agreement (an override) marked with their end | billing `StartSetup`, `ChangeBand`, `StartTrial`, `CancelPending`: `billing` | route `permission: 'billing'`; banner `can('billing')`; with `provider_configured` false (`StartSetup` and priced bands answer 503) no card, automatic upgrade or priced band, only the trial and the lowest band |
| Automatic upgrade toggle | billing `SetAutoUpgrade`: `billing` and the Owner role | `can_manage_auto_upgrade` from the billing service |
| SCIM nav, `/scim`: tokens, halt | user SCIM admin: `settings`, and a plan with SCIM to change anything | route `permission: 'settings'`; buttons need `available` |
| API keys nav, `/api-keys`: list, create, revoke | identity `ListApiKeys`, `CreateApiKey`, `RevokeApiKey`: `api_keys`; each group granted must be one the maker holds, never `api_keys`, `settings` or Owner-only; the plan must include `api_access` | route `permission: 'api_keys'`; the groups offered are the registry's the viewer `can`, less `api_keys`, `settings` and `owner_only`; a plan refusal (`plan.limit_reached`) is shown, with a link to `/billing` for `can('billing')` |
| Webhooks nav, `/webhooks`: event types, endpoints (add, edit, turn on or off, delete, rotate the secret, send a test), deliveries (list, detail, resend) | webhooks admin API: `webhooks` on every request; adding an endpoint, a test and a resend also need the plan's `webhooks` feature (`plan.limit_reached`); at most 20 endpoints (`webhooks.endpoint_limit`) | route `permission: 'webhooks'`; with the event types' `available` false (or a `plan.limit_reached` refusal) Add, Send test and Resend are disabled and the refusal names `required_plan`, with a link to `/billing` for `can('billing')`; editing, turning off, rotating and deleting stay offered on any plan |
| Roles nav, `/roles`: permission matrix, ownership transfer | authorization `SetPermissions`: `configure_permissions`; `RequestOwnershipTransfer`, cancel: the Owner | route `permission: 'configure_permissions'` |
| `/settings/security` (own second factor) | identity: the caller's own | signed in; not in a support session |
| Setup checklist (start page): read; hide or show a step or the whole checklist (the latter also on `/settings`) | organization `GetOnboarding`, `DismissOnboarding`, `RestoreOnboarding`, `DismissOnboardingStep`, `RestoreOnboardingStep`: `settings` | `can('settings')`, else not asked for; hiding and showing not `useReadOnly()` |
| Setup links in empty states (Users, Settings, Single sign-on, Billing) | none: links to the step's page, which has its own gate | the page's own gate; on Users only with `mayInvite` |
| Support access nav, `/support-access`: standing access, consents, support sessions (read) | identity `GetSupportAccess`, `ListImpersonationGrants`, `ListImpersonations`: `settings` | route `permission: 'settings'` |
| Standing access on or off, include Owners; give or withdraw a consent; end a support session | identity `SetSupportAccess`, `CreateImpersonationGrant`, `RevokeImpersonationGrant`, `EndImpersonation`: an Owner of the org, never an Admin, a platform operator, a key or a support session; a consent 15 to 1440 minutes | `role === 'owner'` and not `useReadOnly()`; the duration picker offers 15 minutes to 24 hours only |

**Platform app** (sign-in admits members of the platform org only)

| control or route | backend check | UI gate |
| --- | --- | --- |
| Organizations nav, `/organizations`, `/organizations/:id` | organization `ListOrganizations`, and reads: platform operator | app `orgs: [PLATFORM_ORG]` |
| `/organizations/new` (create, invite the Owner) | organization `CreateOrganization`: platform; identity `CreateInvite`: platform | app `orgs` |
| Plan, status (suspend, reactivate), close, retention | organization `ChangePlan`, `SetOrganizationStatus`, `CloseOrganization`, `SetRetention`: platform | app `orgs`; retention only on a contractual plan |
| Support sessions (an organization's page): consents and standing access, its sessions | identity `ListUsableImpersonationGrants`: platform; `ListImpersonations`: `settings` (a platform operator holds it) | app `orgs` |
| View as (a member) | identity `StartImpersonation`: platform; an open consent or standing access; an Owner only with `include_owners`; an active member of an active org | app `orgs`; `wayIn`: an open consent or standing access, an Owner only when it includes Owners; the target app's origin configured |
| Overrides: list, add, edit, remove | organization `ListPlanOverrides`, `SetPlanOverride`, `RemovePlanOverride`: platform; the key must be registered, an end in the future | app `orgs`; limits and features picked from the plan catalogue, never typed |

**Any app in a support session** (a tab the platform app opened with `?support=1`)

| control or route | backend check | UI gate |
| --- | --- | --- |
| Every write | every service's middleware: a support session's `POST`, `PUT`, `PATCH`, `DELETE` refused, 403 `impersonation.read_only`; security settings, billing, ownership and the account refused whatever is allowed later | `session.impersonation.readOnly`: every submit button disabled and every form submission refused by the shell, `useReadOnly()` for other controls; a refusal is said as a support session's |
| API keys, access tokens, own second factor | identity: no key or token is ever made by a support session | route and menu entry `support: false`: no entry, and the page says it is not available |
| Org switcher, sign-out | the support session is apart from the operator's own (its own cookie) | no switcher; signing out ends the support session only |
| Owner-only pages (roles, ownership) | an Owner is seen as only under `include_owners` | as for the person seen as |

**Account app** (any signed-in person)

| control or route | backend check | UI gate |
| --- | --- | --- |
| Profile, photo, email change, sign out other sessions, your data, deleting the account | user, identity and organization `/v1/me/*`: the caller's own | signed in |
| Notifications nav, preferences, push | notification preferences: the caller's own in the org | signed in; admins' categories shown to admin roles |
| Security nav (own second factor) | identity: the caller's own | signed in |
| Access tokens nav, `/settings/tokens`: own personal access tokens (not in a support session) | identity `ListPersonalAccessTokens`, `CreatePersonalAccessToken`, `RevokePersonalAccessToken`: the caller's own; groups a subset of their own now, never `api_keys`, `settings` or Owner-only; the plan must include `api_access` | signed in; the groups offered are those the person `can`, less the same; a plan refusal is shown, asking whoever manages billing |

## Sessions and tokens

- **Web:** the session is an HTTP-only cookie on the API's host
  (`<productId>_session`), which page script cannot read. The access token
  is short-lived and kept in memory only, never in `localStorage`.
- **Phone:** the cookie is kept in the platform keystore
  (`expo-secure-store`) and presented by hand.
- **Desktop:** main takes the cookie off the identity service's responses and
  keeps it encrypted with Electron's `safeStorage` (DPAPI on Windows, the
  Keychain on macOS); where there is no keychain nothing is written.
- **API keys and personal access tokens** are shown once, in the dialog
  that follows making one, and held only in that dialog's state: closing
  it drops the token, and nothing writes it to storage, a URL or error
  tracking ([api-keys.md](api-keys.md)).
- **Webhook signing secrets** are the same: shown once, after adding an
  endpoint or rotating its secret, held only in that dialog's state and
  dropped when it closes; the endpoint list never carries one
  ([webhooks.md](webhooks.md)).
- **Support sessions** ([impersonation.md](impersonation.md)): the support
  cookie (`<productId>_impersonation`) is HTTP-only on the API's host, apart
  from the operator's own session. The token the platform's start answers
  with is not kept; the support tab gets its own from the support refresh
  and holds it in memory only. The tab keeps one flag, that it is a support
  tab, in its session storage, and nothing of the person's in the device's
  cache.
- **Revocation** reaches an open web tab at once through the live session
  stream (`session.revoked` signs it out).
- **Single sign-on** on the phone and the desktop always opens the system
  browser, never an embedded view, with PKCE: the app holds the verifier and
  redeems a one-time code ([mobile-and-desktop.md](mobile-and-desktop.md)).
- **Required single sign-on.** A password refused with `sso.required` is
  sent on to the organization's provider, never retried; the break glass
  (an Owner with a second factor) is the server's to decide
  ([sso.md](sso.md)).

## The web apps' security headers

Every web app is served with the same strict headers, defined once in
`tools/app-config/headers.mjs`:

| header | value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; scripts from the app itself plus the one first-paint script by its hash; no inline script, no `eval`, no plugins; not framed (`frame-ancestors 'none'`); connections to the app, the API and error tracking only; images from the app and the upload bucket; `upgrade-insecure-requests` |
| `Permissions-Policy` | camera, microphone, display capture, geolocation, payment and USB all denied |
| `Strict-Transport-Security` | two years, subdomains included |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

The CAPTCHA widget's origins (reCAPTCHA) are added to `script-src`,
`frame-src` and `connect-src`, since public forms exist in every app.

### Where they are used

- **Development:** each app's Vite dev server sends them, with the policy as
  `Content-Security-Policy-Report-Only`, so a violation shows in the console
  without breaking the page. The dev policy allows any localhost port.
- **Production:** `npm run generate:web-headers` writes
  `deploy/web/headers.json`, host-agnostic, with placeholders
  (`__API_ORIGIN__`, `__ERROR_ORIGIN__`, `__STORAGE_ORIGIN__`). The nginx
  image in `deploy/web.Dockerfile` turns it into `add_header` lines and fills
  the placeholders at start from `API_ORIGIN`, `ERROR_ORIGIN` and
  `STORAGE_ORIGIN`; one left unset is dropped, never served as a
  placeholder. Another host (a CDN, a different server) applies
  `headers.json` its own way.
- **Desktop:** the packaged shell serves the account app from `app://account`
  with the same production headers.
- **CI:** `npm run check:web-headers` regenerates `headers.json` and fails if
  it differs from what is committed, so the served policy is always the
  defined one. A test in `tools/app-config/headers.test.mjs` holds the policy
  to its rules.

Serving details (caching, `/healthz`, build arguments) are in
[deploy/web/README.md](../deploy/web/README.md).

### Adding what a product needs

A product whose pages need more declares it in `packages/product-config`,
under `webSecurity`, never by editing the headers:

```js
webSecurity: Object.freeze({
  // Sources added to a CSP directive, named without "-src".
  origins: Object.freeze({
    connect: ['wss://rt.example.com', 'https://uploads.example.com'],
    media: ['https://media.example.com'],
  }),
  // Browser features allowed on the app's own origin only.
  permissions: ['camera', 'microphone'],
}),
```

The directives a product can extend are `script`, `style`, `img`, `font`,
`media`, `worker`, `connect` and `frame`. Every app gets the additions. Then
run `npm run generate:web-headers` and commit `deploy/web/headers.json`.

One case to know: the cover upload in the example (and any direct upload to
the bucket by signed URL) sends a `PUT` to the bucket, which needs the
bucket's origin in `origins.connect`. The default only lets pages show
images from the bucket.

### A per-page policy hook

For a product whose policy differs by tenant (an organization that brings
its own media provider, say), the nginx image can ask a service for extra
sources per page, off by default. Set `PAGE_POLICY_URL` and
`PAGE_POLICY_COOKIE` on the container; nginx then appends the sources in the
answer's `X-Csp-Connect`, `X-Csp-Script`, `X-Csp-Frame`, `X-Csp-Media`,
`X-Csp-Worker` and `X-Csp-Img` headers. Nothing of the visitor's is
forwarded, each answer is cached for a minute, and a failure or a slow
answer falls back to the base policy. The template's backend has no such
endpoint; a product writes its own. Details in
[deploy/web/README.md](../deploy/web/README.md#optional-a-per-page-policy-hook).

## Guards in `npm run check` and CI

`npm run check` runs every one of these locally; CI (`.github/workflows`)
runs the same on every pull request, from forks too, with no secret.

| check | what it refuses |
| --- | --- |
| `npm run lint` | string literals in the UI (they go through i18n), hard-coded colours, hostnames or URLs in code, DOM globals in the packages the phone shares, imports across package boundaries |
| `npm run check:web-headers` | `deploy/web/headers.json` differing from its definition |
| `npm run check:inline-scripts` | a built page with an inline script other than the first-paint one, an inline event handler, or a `javascript:` URL, which the policy would block in production |
| `npm run check:api-generated` | a generated API client that does not match its contracts (a hand edit) |
| `npm run check:licences` | a dependency anywhere in `package-lock.json` under the GPL, AGPL, SSPL or a licence the list does not know |
| `npm run check:identifiers` | a tracked file naming the product the template was carved from, its internal ticket keys or hostnames |
| `npm run check:workflows` | a workflow without `permissions: contents: read` at the top, a `pull_request_target` workflow that checks out code, or a job using a secret that is not limited to the upstream repository's `main` or a tag |
| `npm run check:kit-styles` | a web app whose build is missing unitykit's styles |
| `npm run check:examples` | an example product failing its own checks |

`.github/workflows/security.yml` adds, on every ready pull request into
`main` and weekly:
gitleaks over the full git history for secrets, the licence and identifier
checks, and Trivy over the npm lockfile for known vulnerabilities, with
accepted risks in `.trivyignore.yaml` justified and dated. actionlint checks
the workflows' syntax.

A product built on the template changes `UPSTREAM` in
`tools/build-guards/workflows.mjs` to its own repository, so its secrets stay
on its own `main` ([CONTRIBUTING.md](../CONTRIBUTING.md#ci-on-a-public-repository)).

## Other rules

- **No secret in a web build.** Only public values are build variables
  (`VITE_API_ORIGIN`, `VITE_SENTRY_DSN`, `VITE_RECAPTCHA_SITE_KEY`,
  `VITE_RELEASE`). The build makes no source maps and uploads none, so no
  token is needed and none reaches an image. A stack trace in Sentry is
  therefore minified, unless a product adds its own upload step (hidden
  maps, a token passed as a BuildKit secret, the maps deleted before the
  image is made) and clears the uploader's licence with
  `tools/build-guards/licences.mjs`: Sentry's CLI is FSL-1.1-MIT, which the
  template does not carry.
- **Only ids to error tracking:** never names, email addresses or content.
- **Public forms** (signup, forgot password, invite acceptance) carry a
  CAPTCHA token when a site key is configured; the backend verifies it.
- **Desktop renderer:** sandboxed, context isolation on, no Node; the preload
  exposes one named function per capability, and main checks every value
  that crosses it. Notifications and clipboard reads are the only
  permissions granted. A link to anywhere else opens in the browser.
