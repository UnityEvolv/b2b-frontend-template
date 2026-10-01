# Rebranding

The template's defaults are the name **B2B App** and the id **`b2bapp`**.
On the frontend the product's identity lives in one package,
`packages/product-config`; the phone and desktop builds repeat a few values
where their build tools cannot read JavaScript.

The server side (`PRODUCT_NAME`, `PRODUCT_ID`, hostnames, email sender and
templates, the desktop scheme the identity service accepts) is in the
backend's
[rebranding.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/rebranding.md).
Do both: several values below must match a backend setting.

## product-config

`packages/product-config/index.mjs` exports `PRODUCT`:

| field | default | what it is | must match |
| --- | --- | --- | --- |
| `productId` | `b2bapp` | what machines read: lower case letters, digits and hyphens. Cookie names derive from it (below) | the backend's `PRODUCT_ID` (or its `COOKIE_PREFIX`, if set) |
| `productName` | `B2B App` | what people read: page titles (`%PRODUCT_NAME%` in each `index.html`), the brand's accessible name, notification titles, `{{product}}` in any string | the backend's `PRODUCT_NAME` |
| `wordmark` | `['B2B ', 'App']` | the name beside the logo, in pieces that take the theme's secondary and primary colours in turn; a space belongs inside a piece; one piece is one colour | |
| `storagePrefix` | `b2bapp` | the prefix of every key kept on a device (`storageKey('theme')` is `b2bapp:theme`) and of the recovery-codes file name | |
| `urlScheme` | `b2bapp` | links into the desktop and phone apps, `b2bapp://accept-invite?token=…` | the identity service's `DESKTOP_SCHEME` |
| `webSecurity` | nothing added | origins and browser features the product's pages need beyond the strict default headers ([security.md](security.md#adding-what-a-product-needs)) | |

### The logo

`packages/product-config/logo.svg` is a placeholder. Replace the file and
keep its name; the web apps' `Brand` component imports it and shows it as an
image at a fixed height (24, 30 or 40 px) with the width following, so give
the SVG a `viewBox`.

### Cookie names

The identity service sets its cookies on the API's host as
`<prefix>_<name>`, where the prefix is its `PRODUCT_ID` with hyphens as
underscores. The frontend follows the same rule in `cookieName()`:

```js
cookieName('session') // 'b2bapp_session'; with productId 'acme-hr', 'acme_hr_session'
```

A browser never reads the cookie (it is HTTP-only); the phone and the
desktop shell keep it in the platform's secure store and present it
themselves, so they need its name. If a deployment sets the backend's
`COOKIE_PREFIX` to something other than its `PRODUCT_ID`, set `productId`
here to that prefix.

Changing the id on a running deployment changes the cookie names, so
everyone signs in again. Choose it before the first deploy.

## The phone app

`apps/mobile/src/app-identity.json` repeats the defaults that
`app.config.ts` needs at build time:

```json
{ "name": "B2B App", "scheme": "b2bapp", "bundleId": "com.example.b2bapp" }
```

- `name` and `scheme` must equal `productName` and `urlScheme`; a test
  (`app-identity.test.ts`) fails when they drift.
- `bundleId` is the Android package and iOS bundle identifier. Use a
  reverse-DNS name you own. It is not in product-config and nothing checks
  it; change it before the first store upload, since a store treats a new
  id as a new app.

Each can also be set per build with `EXPO_PUBLIC_APP_NAME`,
`EXPO_PUBLIC_APP_SCHEME` and `EXPO_PUBLIC_APP_BUNDLE_ID`
([apps/mobile/README.md](../apps/mobile/README.md)).

## The desktop shell

Two files repeat the identity:

| file | values |
| --- | --- |
| `apps/desktop/src/defaults.config.ts` | `PRODUCT_NAME`, `SCHEME`, `APP_ID` |
| `apps/desktop/electron-builder.yml` | `productName`, `appId`, and `protocols` (the scheme the installer registers) |

`defaults.config.test.ts` fails when `PRODUCT_NAME` or `SCHEME` differ from
product-config. Nothing checks `electron-builder.yml` against them, so
change it in the same commit. `appId` (default `com.example.b2bapp`) is the
app's identity for Windows notifications and macOS signing; use a reverse-DNS
name you own.

The bridge the shell exposes to the page (`window.b2bappDesktop`) and its
IPC channel prefix (`b2bapp:`) are internal names nobody sees; leave them.

## Colours

Pages use unitykit's colour tokens (`primary`, `secondary`, `ok`, `warn`,
`danger`, `info`, `base-*`), defined as CSS custom properties
(`--color-primary`, ...) in `@unityevolv/unitykit/theme.css`, which each web
app's `styles.css` imports; the wordmark takes `secondary` and `primary`.
Lint rejects hard-coded colours in the UI, so a palette change is a change to
those tokens, not to pages. The template ships no palette override of its
own, and v0.1 has no documented, tested way to restyle both themes; if you
redefine the tokens in your apps' `styles.css`, check light and dark.

## What else names the template

- **The npm scope.** The workspaces are `@b2b-template/*`. They are
  private and never published, so the scope needs no change; renaming it
  means renaming every import.
- **CI.** `UPSTREAM` in `tools/build-guards/workflows.mjs` is the repository
  whose `main` may use secrets. Change it to your own repository
  ([CONTRIBUTING.md](../CONTRIBUTING.md#ci-on-a-public-repository)).
- **The identifiers guard.** `npm run check:identifiers` fails on names of
  the product the template was carved from. It does not look for
  `b2bapp`; your own names are yours to keep.

## A checklist

1. Choose the name and the id with the backend's `PRODUCT_NAME` and
   `PRODUCT_ID`.
2. Edit `packages/product-config/index.mjs`: `productId`, `productName`,
   `wordmark`, `storagePrefix`, `urlScheme`.
3. Replace `packages/product-config/logo.svg`.
4. Edit `apps/mobile/src/app-identity.json`,
   `apps/desktop/src/defaults.config.ts` and
   `apps/desktop/electron-builder.yml` to match, with your own bundle id and
   app id.
5. Change `UPSTREAM` in `tools/build-guards/workflows.mjs`.
6. If you changed `webSecurity`, run `npm run generate:web-headers` and
   commit `deploy/web/headers.json`.
7. Run `npm run check`. Its tests catch drift between product-config and the
   phone's and desktop's defaults.
