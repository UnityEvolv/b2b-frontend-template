# Mobile and desktop

Besides the three web apps, the template has a phone app and a desktop
shell. Both are for members (what the account app does), not for admins or
the operator's staff. Each has its own README with every setting:
[apps/mobile/README.md](../apps/mobile/README.md) and
[apps/desktop/README.md](../apps/desktop/README.md). This page is the
overview.

## What v0.1 includes

| | mobile (React Native, Expo) | desktop (Electron) |
| --- | --- | --- |
| sign-in | email first; a password, or the organization's identity provider in the system browser with PKCE | the account web app's sign-in; an identity provider opens in the system browser with PKCE |
| multi-factor | a second factor at sign-in, setting up an authenticator, recovery codes | as on the web |
| profile and sessions | profile, where you are signed in, signing out other sessions | as on the web |
| notifications | the in-app feed, read again every minute while open | the web feed, plus native notices for new entries |
| organizations | choosing, switching and leaving an organization | the web org switcher |
| links from emails | invites, email verification, password links, opened in the app | invites, email verification, password links, through the URL scheme |
| other | update delivery with `expo-updates` | single instance, a tray, background updates |

The mobile app has its own screens (`apps/mobile/src/screens`) built on the
shared packages `api`, `client`, `core`, `i18n` and `theme`. The desktop
shell has no pages of its own: it wraps the account app's web build and
adds a few bridge methods the web code calls (`window.b2bappDesktop`).
Neither has admin or platform screens; those stay on the web.

## Mobile

### Run it

```sh
npm run start -w @b2b-template/app-mobile       # Metro; press a for an Android emulator, or scan with Expo Go
npm run android -w @b2b-template/app-mobile     # build and run on an emulator or a plugged-in device
npm run install:device -w @b2b-template/app-mobile   # release APK signed with the debug keystore, adb install
```

`install:device` needs the Android SDK, a JDK and a device with USB
debugging on. An `ios` script exists (`expo run:ios`, which needs macOS and
Xcode), but only the Android path is documented and exercised here.

### Point it at the backend

The phone cannot reach your laptop's `localhost`, so set the backend's
address in `apps/mobile/.env` (ignored by git) or the shell:

| variable | meaning |
| --- | --- |
| `EXPO_PUBLIC_API_ORIGIN` | the API gateway, such as `http://192.168.1.20:8000` for the local stack on your LAN address |
| `EXPO_PUBLIC_API_ORIGIN_<SERVICE>` | one service's own origin instead (`..._IDENTITY`, `..._USER`, ...) |
| `EXPO_PUBLIC_APP_LINK_HOST` | the web app's host the emails link to; Android opens those links in the app once the host is verified |
| `EXPO_PUBLIC_APP_NAME`, `EXPO_PUBLIC_APP_SCHEME`, `EXPO_PUBLIC_APP_BUNDLE_ID` | the identity, defaulting to `apps/mobile/src/app-identity.json` |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | set by `eas init`; turns on update delivery |

`EXPO_PUBLIC_*` values are inlined at build time; a change needs a rebuild or
an update.

### How sign-in works

The same client as the web (`@b2b-template/client`). For a local account
the person types a password. For an organization with its own identity
provider, the app opens the system browser (`expo-web-browser`, never a
webview) with `client=mobile` and a PKCE challenge; the identity service
returns to `<scheme>://auth/callback` with a one-time code, which the app
redeems with its verifier at `POST /identity/v1/sign-in/exchange`. The
session cookie is kept in `expo-secure-store` and presented by hand; access
tokens are in memory only.

## Desktop

### Run it

```sh
npm run dev -w @b2b-template/app-account        # first: the account dev server on :5173
npm run dev -w @b2b-template/app-desktop        # a window on it
npm run start -w @b2b-template/app-desktop      # a window on the copied account build, as packaged
npm run package -w @b2b-template/app-desktop    # an installer for this platform, in apps/desktop/release/
```

Windows and macOS installers are configured; Linux is not. Signing turns on
when CI has the certificate (`CSC_LINK`, `CSC_KEY_PASSWORD`) and, for macOS
notarisation, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`;
without them the installer is unsigned.

### Configuration

Addresses only, read at launch from the environment, over the
`web/desktop.json` that `build:web` writes from the same variables:
`DESKTOP_API_ORIGIN` (the gateway), `DESKTOP_IDENTITY_ORIGIN` (the identity
service on its own origin, as on a laptop), and `DESKTOP_UPDATE_URL` or
`DESKTOP_UPDATE_GITHUB` for updates. In development `DESKTOP_DEV_URL` points
the window elsewhere than `http://localhost:5173`, and `DESKTOP_DEV_PROTOCOL=1`
registers the URL scheme for the dev build.

### What the shell does

- **PKCE sign-in in the browser.** For an organization's identity provider
  the shell adds `client=desktop` and a PKCE challenge to the identity
  service's `/v1/sign-in/start` and opens it in the person's own browser. The
  service ends at `b2bapp://auth/callback?code=…`, and the shell redeems the
  code at `POST /v1/sign-in/exchange` with the verifier only it holds. The
  backend's `DESKTOP_SCHEME` must equal the frontend's `urlScheme`
  ([rebranding.md](rebranding.md)); empty, it turns desktop sign-in off.
- **The URL scheme and deep links.** The installer registers the scheme
  (`protocols` in `electron-builder.yml`). `b2bapp://accept-invite?token=…`,
  `reset-password`, `set-password` and `verify-email` open those pages;
  nothing else does. A second launch hands its link to the running app and
  exits.
- **The session in the keychain.** The identity service's cookie is kept
  encrypted with `safeStorage`; where there is no keychain nothing is
  written to disk.
- **The tray** opens the app, signs out and quits. Closing the window keeps
  the app in the tray.
- **Updates** download in the background and install on the next start;
  with no feed configured, nothing is checked.
- **Locked down.** The packaged app is served from `app://account` with the
  production security headers. The renderer is sandboxed with context
  isolation and no Node; every value crossing the bridge is checked.
  Notifications and clipboard reads are the only permissions granted.
- `npm run smoke -w @b2b-template/app-desktop` builds, loads once and exits
  0 when the app rendered.

## Known gaps

- **No live session events on the phone.** React Native has no
  `EventSource`, so the mobile app does not open the identity service's
  event stream. A revoked session is noticed at the next token refresh or
  request (the service refuses it), not at once as on the web, and
  `membership.changed` and a product's own live events do not reach the
  phone. The notification feed is read again every minute instead.
- **No push notifications on the phone.** The app does not register for
  push (there is no `expo-notifications`); the feed is in-app only.
- **iOS** is not documented or exercised; Android is.
- **No Linux desktop installer.**
- **Store publishing** (Play Store, App Store, signed and notarised
  desktop releases) needs the product's own accounts and certificates; the
  template only reads them from CI secrets where it can.
- **The bundle id and desktop app id** (`com.example.b2bapp`) are
  placeholders that nothing checks; change them before the first release
  ([rebranding.md](rebranding.md)).
