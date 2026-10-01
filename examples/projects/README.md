# The example product: projects (web)

The web half of the backend's example product
([b2b-backend-template/examples/projects](https://github.com/UnityEvolv/b2b-backend-template/tree/main/examples/projects)):
an organization's projects, the members each is shared with, and a cover
image per project. It is built only through the template's public extension
points. It edits no template page, and no file of the template names it.

[docs/building-an-app.md](../../docs/building-an-app.md) walks through it
step by step; this page is the reference.

Delete this directory and the template is exactly as it was.
`tools/build-guards/without-examples.mjs` proves it on every pull request (the
`without-examples` job in `.github/workflows/ci.yml`).

```
examples/projects/
  specs/projects.yaml       the contract, copied from the backend; never edited here
  src/generated/            generated from it; never edited by hand
  scripts/generate.mjs      specs/ -> src/generated/, the generator packages/api uses
  scripts/sync.mjs          the backend's examples/projects/api -> specs/, then generate
  scripts/check.mjs         its own checks: client drift, build, styles, inline scripts
  src/api.ts                the client, where the service is, and refusals
  src/definition.tsx        the app definition: routes, nav, locales, shell
  src/app.ts, main.tsx      the definition with the real sign-in, and startApp
  src/context.tsx           the client every page shares, and the refusal alert
  src/live.ts               the project.shared live event type
  src/locales/              its strings, in its own namespace
  src/pages/                the list, create, and one project
  src/*.test.ts(x)          every seam, against a mocked API
```

## How it is served

It is its own web app, a fourth beside account, admin and platform, started
with the template's `startApp`. The alternative was to mount its routes into
the account app, but that would make the account app, which is template
code, import from `examples/`, and deleting the directory would break it. As
its own app, the template never refers to it; the product's code refers to
the template, only one way.

Locally, with the template's backend running (its `deploy/docker-compose.yml`):

```sh
# the backend: the projects service, as its README describes, on port 8095
PORT=8095 … go run ./examples/projects
# with ALLOWED_ORIGINS on the template's services including http://localhost:5176

# here
npm run dev -w @b2b-template/example-projects      # http://localhost:5176
```

`.env.development` names each service's port, the projects service's
(`VITE_API_ORIGIN_PROJECTS`) and the admin app's origin
(`VITE_ADMIN_ORIGIN`, for the billing link). A deployed build sets
`VITE_API_ORIGIN` and reaches the service at `/projects` under it, as it
reaches the template's services. With `VITE_DEV_SESSION=1` it runs with the
development session and says it is not connected.

It signs in as the identity service's `account` app: the identity service
knows the template's three apps, and a member signing in here is a member.

## The seams it uses

| seam | what it uses | where | test |
| --- | --- | --- | --- |
| generated API client | `specs/projects.yaml` through openapi-typescript and openapi-fetch, as `packages/api` does; bearer token from the template's `Auth.getToken` | `scripts/`, `src/api.ts` | `api.test.ts`: the generated client, the token, the address |
| drift check | `scripts/check.mjs`, run by `npm run check:examples`, which runs the `check` script of every example there is and passes when there is none | `tools/build-guards/examples.mjs` | `tools/build-guards/examples.test.mjs` |
| app definition, routes, nav | ui-web's `AppDefinition`, `AppRoute` with `nav`, `startApp` | `src/definition.tsx`, `src/main.tsx` | "the app definition" |
| permission group | a route's `permission` (the template's 403 page) and `useSession().permissions.can('projects')` for the controls, as the admin app checks its groups; a 403 from the API is shown all the same | `src/definition.tsx`, the pages | "keeps the create page behind the permission group", "offers no way to create one…", "…is read-only…", "…a 403 from the API is shown…" |
| plan limit | 403 `plan.limit_reached` with `fields.plan`, `limit` and `required_plan`, shown with a link to the admin app's billing page | `src/api.ts` (`refusal`), `src/context.tsx` (`RefusalAlert`) | "at the plan's cap…", `api.test.ts` "a refusal" |
| cursor pagination | `next_cursor` to "Load more" | `src/pages/ProjectsPage.tsx` | "pages by the service's cursor…" |
| idempotency keys | a fresh `Idempotency-Key` for each intended create, the same one when the same submit is retried after no answer or a 5xx, a new one once the details change or the service has refused | `src/pages/NewProjectPage.tsx` (`keyFor`) | "sends a key per create…", "uses a new key once…", `api.test.ts` "the idempotency key" |
| members from the org | the template's users client (`useOrg().api.user`, `GET …/memberships`) for names and whom to share with | `src/pages/ProjectPage.tsx` | "is shared with an org member…" |
| storage (cover) | `POST …/cover` with the type and size, `PUT` to `upload_url` with exactly that `Content-Type`, then the project read again for `cover_url` | `src/pages/ProjectPage.tsx` | "takes a cover…" |
| notification category | nothing: the bell names `project_shared` from the registry the notification service keeps, and its link (`/projects/{id}`) is this app's detail route | none | `api.test.ts` "the project_shared notification" |
| live-session event | `project.shared` declared on `LiveEventTypes` in `@b2b-template/client`, listened for with `useLiveEvent`; the list and the project read again | `src/live.ts`, the pages | "reads again when a project is shared…", "reads again when it is shared…" |
| i18n | its own `projects` namespace, declared on `ProductResources` in `@b2b-template/i18n` and handed to the shell as the definition's `locales`; keys are checked by the compiler, and lint rejects literal strings here as in the template | `src/locales/` | every page test reads the words from it; `packages/i18n` and `packages/ui-web` `start.test.tsx` test the seam |
| shell | the definition's `shell` holds the projects client for every page | `src/definition.tsx` | every page test |

The i18n seam (`ProductResources`, `ProductLocales`, `AppDefinition.locales`)
was added to the template for this example; it names no product.

## Keeping the client in step

```sh
npm run sync -w @b2b-template/example-projects        # ../b2b-backend-template
npm run sync -w @b2b-template/example-projects -- /path/to/backend
```

copies the backend's `examples/projects/api/*.yaml` into `specs/` and
regenerates. `npm run check:examples` fails when `src/generated/` does not
match `specs/`.

## What it does not do

- The account app's bell links a `project_shared` entry to `/projects/{id}`
  on the account app's host. Served as its own app, this one is on another
  host; a deployment routes `/projects/*` to it, or a product mounts these
  routes in its own member app.
- People to share with are the first 200 active members, one page of the
  users service; a larger org needs a search.
- Deployed, the template's policy lets pages show images from the upload
  bucket (`img-src`) but not send to it. The cover's `PUT` needs the bucket's
  origin in `connect-src`: a product adds it in `product-config`'s
  `webSecurity.origins.connect`. The example does not, since that file is
  the template's; on a laptop the development policy allows any localhost
  port.

## Deleting it

Delete `examples/`. If you like, delete `tools/build-guards/without-examples.mjs`,
the `without-examples` job and the "Each example product" step in
`.github/workflows/ci.yml`, the paragraph in CONTRIBUTING.md that points
here, and `examples/*` in the root `package.json`'s workspaces. Nothing else
refers to it: `npm run check:examples` passes when there is no example, and
the lint and test globs for `examples/` match nothing.
