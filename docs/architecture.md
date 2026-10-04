# Architecture

How the frontend is put together, and the places a product plugs in. The
backend's side is in its own
[architecture.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/architecture.md).

The rules every change follows (package boundaries, data rules, CI on a
public repository) are in [CONTRIBUTING.md](../CONTRIBUTING.md#architecture);
this page explains the shape behind them.

## The workspace

One npm workspace (`package.json`'s `workspaces`: `apps/*`, `packages/*`,
`tools/*`, `examples/*`), Node 20 or later.

```
apps/
  account    @b2b-template/app-account    members: profile, notifications, sessions, their own data   :5173
  admin      @b2b-template/app-admin      Owners, Admins, Billing Admins: users, invites, import,
                                          roles, settings, billing, SCIM, audit log                   :5174
  platform   @b2b-template/app-platform   the operator's staff: every organization and its plan      :5175
  mobile     @b2b-template/app-mobile     React Native with Expo
  desktop    @b2b-template/app-desktop    Electron shell around the account app
packages/
  api             typed clients generated from the backend's OpenAPI contracts
  client          sign-in, the session, account flows, plans, notifications, live events
                  (web and phone)
  core            permission checks and formatting; no DOM, no React
  i18n            the template's strings, and the seam for a product's own
  theme           light, dark or follow the system
  product-config  the product's name, id, wordmark, logo, storage prefix, URL scheme,
                  and the extra origins its pages need
  ui-web          the web shell: startApp, routing, layout, sign-in pages, hooks
tools/
  app-config      the one Vite configuration, and the security headers
  build-guards    the checks `npm run check` runs beyond types, lint and tests
examples/
  projects        an example product built only through the seams below   :5176
deploy/
  web.Dockerfile  each web app as an nginx container with the generated headers
  web/            headers.json, nginx.conf, the entrypoint
```

The ports are each app's `vite.config.ts` (`defineAppConfig({ port })`), with
`strictPort`, so all of them run at once and the backend's CORS settings can
name them.

`api`, `client`, `core`, `i18n` and `theme` also run on React Native, so they
use no DOM globals; anything browser-only is in `ui-web` or passed in.

## How a web app starts

Each web app is a few lines: an `AppDefinition` and a call to `startApp`.

```ts
// apps/admin/src/main.tsx
import { startApp } from '@b2b-template/ui-web'
import { definition } from './app'

startApp(definition, document.getElementById('root')!)
```

`AppDefinition` (in `packages/ui-web/src/app.tsx`) is the one seam for an
app. Its main fields:

| field | what it does |
| --- | --- |
| `app` | the app's name; also the identity service's app name for sign-in |
| `routes` | `AppRoute[]`: `path`, a lazily imported `page`, `access` (`'signed-in'` by default, or `'public'`), an optional `permission` (a permission group, or a list of which any one will do; without it the shell shows its 403 page and leaves the route out of the menu), and an optional `nav` entry |
| `home`, `signInPath`, `signupPath` | where `/`, a signed-out visitor and "create an organization" go |
| `navNamespace`, `locales` | the namespace of the app's own strings, and a product's namespaces (see [i18n](#strings)) |
| `sessionSource`, `auth` | the session: `createAuth(...)` against the identity service, or the development session |
| `shell`, `banner`, `headerActions` | components the app adds around every signed-in page: a provider it keeps across pages, a notice above the content, controls in the header |
| `orgSwitcher`, `accountMenu`, `badge`, `capabilities` | the header's org switcher, extra account-menu pages, a badge beside the brand, browser features required before loading |
| `errorTracking`, `captcha` | from the build's environment; both absent on a laptop |

The shell brings everything else: sign-in and its redirect, the layout and
menu, theme, language, loading and error pages, toasts, the org switcher and
the live session stream. A page is a component that reads `useSession()`,
`useOrg()` (the typed API and the current org) and `useTranslation()`.

### Sign-in and the session

```ts
const auth = createAuth({
  app: 'admin',
  ...serviceOriginsFromEnv(import.meta.env),
  roles: ['owner', 'admin', 'billing_admin'],
})
```

`createAuth` signs in against the identity service, which keeps the session
in an HTTP-only cookie (`<productId>_session`, see
[rebranding.md](rebranding.md#cookie-names)) and hands the app a short-lived
access token held in memory. `roles` limits an app to some roles: a plain
member who signs in to the admin app is told it is for administrators.

`serviceOriginsFromEnv` reads where the services are from the build:

- **Deployed:** `VITE_API_ORIGIN`, the gateway; every service is a path under
  it (`/identity`, `/organization`, ...).
- **On a laptop:** `VITE_API_ORIGIN_<SERVICE>` per service, from each app's
  `.env.development` (identity on 8093, organization 8081, audit 8082,
  notification 8083, user 8084, authorization 8086, webhooks 8087, billing
  8089: the ports the backend's compose stack publishes).

In a development build, `VITE_DEV_SESSION=1` skips sign-in and signs in a
fake developer with no backend. Pages that need data then have none; it is
for working on layout.

## The API client

`packages/api` is generated, never written:

- `specs/*.yaml` are copies of the backend's `api/*.yaml`.
- `src/generated/` is built from them by openapi-typescript
  (`npm run generate -w @b2b-template/api`).
- `src/index.ts` is `createApi`, one openapi-fetch client per service with
  the bearer token attached.

`npm run sync -w @b2b-template/api` copies the contracts from a backend
checkout (by default `../b2b-backend-template`) and regenerates.
`npm run check:api-generated`, part of `npm run check`, regenerates from
`specs/` and fails if the result differs from what is committed. The full
workflow is in [packages/api/README.md](../packages/api/README.md).

Every error has the shape `{ code, message, fields? }`. Pages pick a
translated message by `code` and put `fields` beside their inputs.

## Pages render the backend's registries

A product registers its plan limits, permission groups and notification
categories on the backend
([building-a-product.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/building-a-product.md)).
The frontend has no list of them. It asks:

| page | reads | from |
| --- | --- | --- |
| admin: Roles | the permission groups and their labels, and which role holds which | `GET /authorization/v1/permission-groups`, `.../organizations/{org_id}/permissions` |
| admin: Billing, platform: an organization's plan | the plan bands, limits and features with their labels; the org's plan, the overrides in force and current usage | `usePlanCatalogue` (`GET /organization/v1/plans`), `useOrganizationPlan` (`GET .../organizations/{org_id}/plan`) |
| platform: an organization's overrides | the limits and features an override can be set on, from the catalogue | `usePlanCatalogue`, `GET .../organizations/{org_id}/plan-overrides` |
| admin: API keys, account: access tokens | the permission groups a key can be given, less `api_keys`, `settings` and the Owner-only ones | `GET /authorization/v1/permission-groups` ([api-keys.md](api-keys.md)) |
| account: notification preferences, the bell, the phone's feed | the notification categories and their channels; each feed entry's heading and line, worded by the server | `useNotificationCategories` (`GET /notification/v1/notification-categories`), the feed |

Each is read when the page opens, and again after a change; nothing is kept
between visits or baked into the build. A product that adds a plan limit or a
permission group on the backend sees it on these pages with no frontend
change.

The same goes for limits: the UI never decides on its own that an action is
over the plan's cap. The server checks the cap when the action happens and
answers 403 `plan.limit_reached` with `fields.plan`, `limit` and
`required_plan`; the page shows that refusal (the example's `RefusalAlert`
links to the admin app's billing page). Hiding a control a person cannot use
is a convenience; the API refuses it independently.

## Live session events

Every signed-in web app keeps the identity service's Server-Sent Events
stream open (`GET /identity/v1/session/events`, `LiveSessionProvider` in
`ui-web`). The shell answers the core's events itself:

| event | the shell |
| --- | --- |
| `session.revoked` | signs the tab out at once |
| `membership.changed` | loads the session again (roles, permissions) |
| `org.suspended` | loads the session again |

A product adds its own event types by augmenting `LiveEventTypes` in
`@b2b-template/client`, and listens with `useLiveEvent(type, handler)` from
`ui-web`:

```ts
declare module '@b2b-template/client' {
  interface LiveEventTypes {
    'project.shared': { project_id: string }
  }
}

useLiveEvent('project.shared', (event) => {
  if (!event.data?.project_id || event.data.project_id === projectId) reload()
})
```

Events carry ids only, never names or content; the handler reads fresh data
from the API. The backend registers the same type in the service that
publishes it. The stream needs the platform's `EventSource`; the phone has
none, so the mobile app does not open it (see
[mobile-and-desktop.md](mobile-and-desktop.md#known-gaps)).

## Strings

Every user-facing string goes through i18next; lint rejects string literals
in the UI. The template's strings are in `packages/i18n`. A product keeps
its own in its own namespace:

```ts
declare module '@b2b-template/i18n' {
  interface ProductResources {
    projects: typeof projects
  }
}

export const locales = { en: { projects } } satisfies ProductLocales
```

and hands `locales` to its `AppDefinition`. `t('projects:list.title')` is
then checked by the compiler like the template's own keys. A product's
namespace sits beside the template's and never replaces one of them. Every
string may use `{{product}}`, the product's name from `product-config`.

## The product's identity

`packages/product-config` holds everything that names the product: its name,
id, wordmark, logo, storage prefix, URL scheme and the extra origins its
pages need. Nothing else in the code names it. See
[rebranding.md](rebranding.md).

## Build and serving

`tools/app-config` is the one Vite configuration every web app uses
(`defineAppConfig({ port })`): React, Tailwind, the product's name in each
`index.html` title, the first-paint theme script, and the security headers, report-only in development. `deploy/web.Dockerfile`
builds one app (`--build-arg APP=account`) into an nginx image that sends the
generated headers ([deploy/web/README.md](../deploy/web/README.md),
[security.md](security.md)).

## Phone and desktop

The mobile app (Expo) uses `api`, `client`, `core`, `i18n` and `theme`
directly with its own screens. The desktop shell (Electron) has no pages: it
wraps the account web app's build and exposes a small bridge
(`window.b2bappDesktop`). See [mobile-and-desktop.md](mobile-and-desktop.md).

## The example product

`examples/projects` is a fourth web app built only through the seams on this
page. [building-an-app.md](building-an-app.md) walks through it.
