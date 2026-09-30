# B2B frontend template

The frontend half of an open-source starting point for multi-tenant B2B SaaS
products. The backend half is
[b2b-backend-template](https://github.com/UnityEvolv/b2b-backend-template).

> **Status: under construction.** The first release, v0.1.0, is not out yet.
> Nothing here is ready to build on.

## What it gives a product

- **Web apps:**
  - an **account** app for members: profile, notifications, email change, and
    their own data
  - an **admin** app for organisation admins: users, invites, import, roles,
    single sign-on, SCIM, billing and the audit log
  - a **platform** console for the operator's staff: organisations and plans
- **Mobile app** (React Native with Expo): sign-in, multi-factor
  authentication, profile, notifications and organisation switching.
- **Desktop shell** (Electron): desktop sign-in, deep links and a tray.
- **Shared packages:** the app frame, session and auth logic, typed API clients
  generated from the backend's OpenAPI specs, theming, and i18n.
- **Build tooling:** a shared Vite config, and generated security headers and
  Content Security Policy.

A product adds its own apps, routes and menu entries to the shared frame. It
does not edit the template's code.

## Naming the product

The product's identity lives in `packages/product-config`:

- `index.mjs` holds `productName` (titles, the brand's accessible name,
  notification titles), `wordmark` (the name beside the logo, in pieces that
  take the theme's secondary and primary colours in turn), `storagePrefix`
  (every key kept on a device) and `urlScheme` (links into the desktop and
  phone apps).
- `logo.svg` is a starter placeholder logo. Replace the file, keeping its
  name, and the web apps' `Brand` shows the product's own.

## Licence

[MIT](LICENSE).
