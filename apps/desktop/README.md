# Desktop

The Electron shell around the account web app. It wraps the web build; it
never duplicates a page. [docs/mobile-and-desktop.md](../../docs/mobile-and-desktop.md)
compares it with the phone app and lists the known gaps.

```sh
npm run dev -w @b2b-template/app-desktop        # window on the account dev server (start it first: npm run dev -w @b2b-template/app-account)
npm run start -w @b2b-template/app-desktop      # window on the copied account build, as packaged
npm run package -w @b2b-template/app-desktop    # installer for this platform, in release/
```

- **Packaged**, the app is served from its own origin, `app://account`, with
  the production security headers from `deploy/web/headers.json`.
- **Development** points at `DESKTOP_DEV_URL` (default in `src/defaults.config.ts`).
- The window shows the app and nothing else: a link elsewhere opens in the
  browser. The renderer is sandboxed with context isolation and no Node; the
  preload exposes `window.b2bappDesktop`, one named function per capability,
  and main checks every value that crosses it. Every IPC channel is prefixed
  `b2bapp:`.
- Notifications and clipboard reads are the only permissions granted.
- `--smoke-test` loads once and exits 0 when the app rendered.

The app id, product name and scheme are `com.example.b2bapp`, `B2B App` and
`b2bapp`: in `electron-builder.yml` and `src/defaults.config.ts`, which must
agree.

## Configuration

Addresses only, never a secret. Read from the environment at launch, over
`web/desktop.json`, which `build:web` writes from the same variables so an
installer carries them:

| Variable                  | What                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| `DESKTOP_API_ORIGIN`      | The API gateway: the policy's connect-src; identity is its `/identity`. |
| `DESKTOP_IDENTITY_ORIGIN` | The identity service on its own origin (a laptop: its own port).        |
| `DESKTOP_UPDATE_URL`      | A generic update feed over https (a folder with `latest*.yml`).         |
| `DESKTOP_UPDATE_GITHUB`   | Or `owner/repo`, for a GitHub repository's releases.                    |

The web build inside carries its own `VITE_*` addresses, as on the web.

## What the shell does

- **Links into the app.** The installer registers the `b2bapp` scheme
  (`protocols` in `electron-builder.yml`). `b2bapp://accept-invite?token=…`,
  `reset-password`, `set-password` and `verify-email` open those pages;
  nothing else does. In development set `DESKTOP_DEV_PROTOCOL=1` to register
  the dev build.
- **One instance.** A second launch hands its link to the running app and
  exits; the window comes forward.
- **Sign-in through the browser.** An organization that signs in with its
  identity provider opens its sign-in in the person's own browser, never an
  embedded view. The shell adds `client=desktop` and a PKCE challenge to the
  identity service's `/v1/sign-in/start`; the service ends at
  `b2bapp://auth/callback?code=…&next=…` with a one-time code, which the app
  redeems at `POST /v1/sign-in/exchange` with the verifier only it holds.
- **The session in the keychain.** The identity service's cookie is taken off
  its responses by main, kept encrypted with `safeStorage` (DPAPI on Windows,
  the Keychain on macOS) in `session.bin` under the user data folder, and put
  back on each request to the identity service. Signing out (which clears the
  cookie) or a refused refresh deletes it. Where there is no keychain nothing
  is written to disk.
- **The tray** opens the app, signs out (the page signs out, as its own menu
  would) and quits. Closing the window keeps the app in the tray.
- **Updates** download in the background and install on the next start, from
  the feed configured above; with none, nothing is checked.
- **Signing** turns on from CI secrets when they exist: `CSC_LINK` and
  `CSC_KEY_PASSWORD` (the certificate), and `APPLE_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` for notarisation. Without
  them the build is unsigned.
