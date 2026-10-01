# Building an app

How a product adds its own web app on top of the template, by walking
through the example that ships with it:
[examples/projects](../examples/projects/README.md), an organization's
projects, the members each is shared with, and a cover image per project.

The backend half of the same example, with its service, plan limit,
permission group, notification category and live event, is in the backend's
[building-a-product.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/building-a-product.md).
Read that first if the server side is new to you; this page assumes the
backend already serves your product's API.

The rule the example follows: **a product adds to the template and never
edits it.** No file of the template names the example, and deleting
`examples/` leaves the template exactly as it was (CI proves it). Follow the
same rule and you can take the template's fixes later.

## 1. A workspace for the app

The example is a workspace like the template's apps:
`examples/projects/package.json` names it `@b2b-template/example-projects`,
with `dev`, `build`, `typecheck`, `generate`, `sync` and `check` scripts. Its
`vite.config.ts` is one line, the template's shared config with its own port:

```ts
import { defineAppConfig } from '@b2b-template/app-config'

export default defineAppConfig({ port: 5176 })
```

That brings React, Tailwind, the product's name in the page title, the
first-paint theme script and the same security headers as the template's
apps. `index.html`, `src/main.tsx` and `src/styles.css` are copies of an
existing app's (the stylesheet imports unitykit's tokens and points
Tailwind's `@source` at the kit; `npm run check:kit-styles` fails an app
without them).

Your own app can live under `apps/`, `examples/` or a directory you add to
the root `package.json`'s `workspaces`.

## 2. The generated client

The product's service has its own OpenAPI contract, and its client is
generated exactly as `packages/api` generates the template's:

```
examples/projects/
  specs/projects.yaml     copied from the backend's examples/projects/api/; never edited here
  src/generated/          generated from it by scripts/generate.mjs; never edited by hand
  scripts/sync.mjs        backend contract -> specs/, then generate
```

```sh
npm run sync -w @b2b-template/example-projects                     # from ../b2b-backend-template
npm run sync -w @b2b-template/example-projects -- /path/to/backend
npm run generate -w @b2b-template/example-projects                 # specs/ -> src/generated/ only
```

`src/api.ts` wraps it with openapi-fetch and attaches the template's bearer
token:

```ts
createProjectsApi({ baseUrl, getToken: () => auth.getToken() })
```

Where the service is comes from the build, never from code:
`VITE_API_ORIGIN_PROJECTS` on a laptop (in `.env.development`, port 8095),
or `/projects` under `VITE_API_ORIGIN` when deployed. The template's own
services stay reachable through `useOrg().api` (the example reads the org's
members from the users service that way).

## 3. The app definition

`src/definition.tsx` returns an `AppDefinition`, the template's one seam for
an app ([architecture.md](architecture.md#how-a-web-app-starts)):

```ts
return {
  app: 'projects',
  navNamespace: 'projects',
  locales,                       // the app's strings, step 6
  home: '/projects',
  signInPath: '/sign-in',
  routes,                        // its pages, and the template's sign-in pages
  shell: Shell,                  // a provider holding the projects client for every page
  sessionSource: options.sessionSource,
  ...(auth ? { auth } : {}),
}
```

Routes declare a path, a lazily loaded page, and optionally a permission and
a menu entry:

```ts
{
  path: '/projects',
  page: () => import('./pages/ProjectsPage'),
  nav: { key: 'projects', icon: 'file', label: (t) => t('projects:nav.projects') },
},
```

The template's own pages (sign-in, forgot password, MFA setup) are reused as
routes, imported from `@b2b-template/ui-web`.

`src/app.ts` adds sign-in and the build's configuration, and `src/main.tsx`
calls `startApp(definition, ...)`:

```ts
const auth = createAuth({ app: 'account', ...serviceOriginsFromEnv(import.meta.env) })
```

The example signs in as the identity service's `account` app: the identity
service knows the template's three apps (its `APP_NAMES`), and a member
signing in to the example is a member. A product whose app is a fourth app
of its own registers it on the backend
([rebranding.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/rebranding.md#hostnames-and-apps)).

## 4. Permission gating

The backend declares a `projects` permission group; an organization's Owner
grants it to roles on the admin app's Roles page (which lists whatever
groups the backend registers). The app checks it in two places:

- **The route.** `permission: PROJECTS_PERMISSION` on `/projects/new`: a
  person without it gets the template's 403 page, and the route has no menu
  entry.
- **The controls.** `useSession().permissions.can(PROJECTS_PERMISSION)`
  hides "New project" and makes a project read-only for someone who cannot
  write.

Neither is the real check. The service refuses a write without the group,
and a 403 from it is shown all the same (`refusal()` in `src/api.ts`
returns `{ kind: 'forbidden' }`). Anything the UI disables, the API refuses.

## 5. Plan refusals

The UI does not know the plan's caps and does not count. The service checks
the cap when a project is created and, over it, answers 403 with:

```json
{ "code": "plan.limit_reached", "message": "...",
  "fields": { "plan": "free", "limit": "projects", "required_plan": "team" } }
```

`refusal()` turns that into `{ kind: 'plan', plan, limit, requiredPlan }`,
and `RefusalAlert` (in `src/context.tsx`) says so in the app's words, with a
link to the admin app's billing page (`VITE_ADMIN_ORIGIN` + `/billing`).
After an upgrade or a trial the next create succeeds with no reload: the
limit is read on the server at the moment of the action.

The admin app's Billing page lists the product's limit beside the
template's with no frontend change, because it renders the plan catalogue
the organization service returns.

## 6. Strings in the app's own namespace

Every word is in `src/locales/en.ts`, in a `projects` namespace that
`src/locales/index.ts` declares on the template's `ProductResources`:

```ts
declare module '@b2b-template/i18n' {
  interface ProductResources {
    projects: typeof projects
  }
}

export const locales = { en: { projects } } satisfies ProductLocales
```

The definition hands `locales` to the shell, pages call
`useTranslation('projects')`, and the compiler checks every key. Lint rejects
string literals in the example's pages as it does in the template's.

## 7. Live events

When a project is shared with someone, the backend publishes
`project.shared` to that person's open sessions. `src/live.ts` declares the
type on the template's `LiveEventTypes`:

```ts
declare module '@b2b-template/client' {
  interface LiveEventTypes {
    'project.shared': { project_id: string }
  }
}
```

and the pages read again when it arrives:

```ts
useLiveEvent(PROJECT_SHARED, (event) => {
  if (!event.data?.project_id || event.data.project_id === projectId) reload()
})
```

The stream itself is the template's; the app opens nothing.

## 8. Notifications

Nothing to write. The backend registers a `project_shared` notification
category with its words; the account app's bell and preferences list it
from the notification service's registry, and its link
(`/projects/{id}`) is the example's detail route.

## 9. Checks

`scripts/check.mjs` is the example's own check: its generated client
matches `specs/`, it builds, the build carries unitykit's styles and no
inline script the security policy would block. `npm run check:examples` runs
the `check` script of every workspace under `examples/`, and is part of
`npm run check`. Its tests (`src/*.test.ts(x)`) run with the rest under
`npm test`, against a mocked API.

## Running it

With the backend's local stack up
([getting-started.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/getting-started.md))
and the backend's projects service running on port 8095 as its
[README](https://github.com/UnityEvolv/b2b-backend-template/blob/main/examples/projects/README.md)
describes (its CORS settings must include `http://localhost:5176`):

```sh
npm run dev -w @b2b-template/example-projects      # http://localhost:5176
```

Sign in as a seeded member, such as `owner@demo.example.test`. With
`VITE_DEV_SESSION=1` it starts with no backend at all and says it is not
connected.

The example's known limits (it is served as its own app on its own host;
sharing lists the first 200 members; a deployed cover upload needs the
bucket in `webSecurity.origins.connect`) are in its
[README](../examples/projects/README.md#what-it-does-not-do).

## Deleting the example

When you start your own product, delete `examples/`. Optionally also delete
`tools/build-guards/without-examples.mjs`, the `without-examples` job and
the "Each example product" step in `.github/workflows/ci.yml`, the paragraph
in CONTRIBUTING.md that points to it, and `examples/*` from the root
`package.json`'s `workspaces`. Nothing else refers to it:
`npm run check:examples` passes when there is no example. Then run
`npm install` and `npm run check`.

Before deleting it, `npm run check:without-examples` shows the result: it
copies the repository without `examples/` to a temporary directory and runs
the install, type check, lint, tests, build and guards there.
