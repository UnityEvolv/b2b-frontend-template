# Contributing

Thank you for helping. This file covers how to propose a change.

## Before you start

- For anything bigger than a small fix, open an issue first so the approach can
  be agreed before you write code.
- Security problems are reported privately. See [SECURITY.md](SECURITY.md).
- Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
- New to the codebase? Start with the [README](README.md) and
  [docs/architecture.md](docs/architecture.md).

## Making a change

1. Fork the repository and create a branch from `main`.
2. Keep the pull request small and focused on one thing.
3. Put tests beside the code they test.
4. Use [conventional commit](https://www.conventionalcommits.org/) messages, for
   example `feat(admin): ...` or `fix(ui-web): ...`.
5. Run the full check before opening the pull request:

   ```sh
   npm ci
   npm run check
   ```

   This covers type checking, lint, tests, the build, and the build guards. The
   API clients are generated from the backend's OpenAPI specs; never edit them
   by hand.

## What every change must get right

- User-facing text goes through i18n. Lint rejects string literals in the UI.
- Colours and spacing come from the design system, not hard-coded values.
- No hostnames or product URLs in code; they come from configuration.
- Anything the UI disables must also be refused by the API. Hiding a button is
  never the only check.

## Architecture

The template is the generic half of a B2B product: accounts, organisations,
members, roles, billing, notifications and the apps around them. A product is
built on top of it and does not edit the template's code. These are the rules
that keep that true. Most are enforced by lint or a check in `npm run check`.
[docs/architecture.md](docs/architecture.md) explains the shape behind them.

### Layout

```
apps/
  account    the member app: profile, account, notifications, own data
  admin      organisation admins: users, invites, import, roles, settings,
             billing, SCIM, API keys, webhooks, audit log
  platform   the operator's staff: organisations across the platform
  mobile     React Native with Expo, sharing the packages below with web
  desktop    an Electron shell around the account web app; it has no pages
             of its own, only bridge methods the web code calls
packages/
  api             typed clients generated from the backend's OpenAPI specs
  client          sign-in, the session and the account flows, for web and phone
  core            permission checks and formatting; no DOM, no React
  i18n            every user-facing string
  theme           light, dark or follow the system
  product-config  the product's names, logo, storage prefix, URL scheme and
                  the extra origins its pages need
  ui-web          the web app shell every page renders inside
tools/
  app-config      the one Vite configuration and the security headers
  build-guards    checks run on the built apps
```

### Seams: where a product plugs in

- **Identity.** The product's name, wordmark, logo, storage prefix and URL
  scheme live in `packages/product-config`. Nothing else names the product.
  The phone and the desktop shell repeat those defaults where their build
  tools cannot read JavaScript, and a test fails when they drift
  ([docs/rebranding.md](docs/rebranding.md)).
- **Apps, routes and menus.** A product adds its own app, or routes and menu
  entries, to the shared shell in `ui-web`. It never forks a template page.
- **Strings.** A product's own namespace is declared on `ProductResources` in
  `@b2b-template/i18n` and handed to its app definition as `locales`; the
  template's strings stay in the i18n package, and lint rejects literals in a
  product's pages as it does in the template's.
- **Security headers.** Extra origins and browser features the product's
  pages need are declared in `product-config` (`webSecurity`); the headers
  in `deploy/web` are generated from that and checked in CI
  ([docs/security.md](docs/security.md)).
- **Live session events.** Every signed-in web app keeps the identity
  service's event stream (`/identity/v1/session/events`) open. The shell
  answers the core's events itself: `session.revoked` signs the person out,
  `membership.changed` and `org.suspended` load the session again. A product
  declares its own event types on `LiveEventTypes` in `@b2b-template/client`
  and listens with `useLiveEvent(type, handler)` from `ui-web`.
- **An example.** `examples/projects` is a small product built only through
  these seams: its own app, generated client, strings, permission group,
  plan refusal and live event. It is a workspace like the apps, and its own
  checks run from `npm run check:examples`. Delete `examples/` and the
  template is exactly as it was; CI proves it on every pull request
  (`npm run check:without-examples`). [docs/building-an-app.md](docs/building-an-app.md)
  walks through it.
- **Deployment configuration.** Hostnames, the API base URL, error tracking
  and CAPTCHA keys come from the build's environment, never from code.

### Package boundaries

- `api`, `client`, `core`, `i18n` and `theme` run on React Native too: no DOM
  globals and no `react-dom` there. Browser-only code lives in `ui-web` and is
  passed in.
- Icons come from unitykit's `Icon` component, not from `lucide-react`.
- Every web app imports unitykit's tokens and points Tailwind's `@source` at
  the kit. Without it the components render unstyled with no error, so a
  build guard checks it.
- Only MIT-compatible dependencies. Nothing under the AGPL, GPL or SSPL is
  allowed anywhere in the dependency graph; CI checks the licence of every
  package.

### Data rules

- The server is the source of truth. Pages read fresh after a change rather
  than patching a local copy, and never decide on their own what a person may
  do.
- Only ids go to error tracking: never names, email addresses or content.
- Anything kept on a device uses a key from `storageKey()` in
  `product-config`, and only in `ui-web`, the phone or the desktop shell.
- Sessions are held by the platform's secure store: an HTTP-only cookie on
  the web, the keychain or keystore on the phone and the desktop.

### API conventions

- The clients in `packages/api` are generated. `specs/` is a copy of the
  backend's contracts and `src/generated/` is built from it; neither is
  edited by hand, and CI fails on drift. A change to an endpoint starts in the
  backend repository.
- Every error has the shape `{ code, message, fields? }`. Pages show a
  translated message chosen by `code`, and put `fields` beside their inputs.

### Security

- The web apps ship with a strict Content Security Policy and no inline
  script except the first-paint theme script, allowed by its hash. A build
  guard fails on any other.
- Public forms (signup, forgot password, invite acceptance) carry a CAPTCHA
  token; the backend verifies it.
- The UI hides what a person cannot do, and the API refuses it independently.
- No secret is ever in the repository or in a web build. CI scans the whole
  history for secrets on every pull request.

### CI on a public repository

- Build, test, lint and the drift checks need no secret, so a pull request
  from a fork runs them all.
- Every workflow starts from `permissions: contents: read`. A job that needs
  more asks for it itself.
- No `pull_request_target` workflow checks out code.
- A job that uses a secret or a deployment environment runs only on the
  upstream repository, and only from `main` or a tag:
  `if: github.repository == 'UnityEvolv/b2b-frontend-template' && github.ref == 'refs/heads/main'`.
  A product built on the template changes `UPSTREAM` in
  `tools/build-guards/workflows.mjs` to its own repository.
- `npm run check:workflows` enforces these rules, and actionlint checks the
  workflows' syntax. The security workflow scans the full history for secrets
  with gitleaks, refuses GPL, AGPL, SSPL and unknown licences in the
  dependency graph (`npm run check:licences`), and scans the lockfile for
  known vulnerabilities.

### Definition of done

Responsive, both themes, loading, empty and error states, and WCAG 2.1 AA:
keyboard, focus ring, labels, contrast, nothing by colour alone, reduced
motion and live regions. axe runs in the tests.

## Licence

By contributing you agree that your contribution is licensed under the
[MIT licence](LICENSE).
