# End-to-end tests

Real pages in a real browser (Chromium, through Playwright) against the
backend's running local stack: what the unit tests cannot see, such as the
support cookie the platform app's origin gets from the API's, the tab "View
as" opens under `Cross-Origin-Opener-Policy: same-origin`, and the live
event that ends a support tab.

- `support-mode.spec.ts`: an Owner consents, a platform operator views as a
  member in a new tab (marked, read-only, a forced write refused with
  `impersonation.read_only`, tokens unavailable, the operator's own session
  untouched), and withdrawing the consent ends the tab at once; the audit
  log has the session ([impersonation.md](../../docs/impersonation.md)).
- `onboarding.spec.ts`: an operator makes an org, and its new Owner works
  through the setup checklist ([onboarding.md](../../docs/onboarding.md)).

They are never part of `npm run check` or CI: they need the stack.

## Run them

1. Start the backend's local stack from this checkout and seed it
   (`docs/local-dev.md` in the backend), with a platform operator: in its
   `deploy/.env`, `BOOTSTRAP_OPERATOR_EMAIL=operator@example.test`.
2. Once per machine, the browser: `npx playwright install chromium`.
3. `npm run e2e`

The first run accepts the operator's invite from the mail catcher, sets the
password and an authenticator, and keeps the authenticator's key in
`tools/e2e/.auth/` (ignored by git) for the next run. A stack whose operator
was set up some other way gives the key as `E2E_OPERATOR_TOTP_SECRET`.

Every address is a setting, for a stack on other ports:

| | default |
| --- | --- |
| `E2E_ACCOUNT_URL`, `E2E_ADMIN_URL`, `E2E_PLATFORM_URL` | `http://localhost:5173`, `:5174`, `:5175` |
| `E2E_API_URL` | `http://localhost:8000` |
| `E2E_MAIL_URL` | `http://localhost:8025` |
| `E2E_OWNER_EMAIL`, `E2E_PASSWORD` | the seed's `owner@demo.example.test`, `demo-password-change-me` |
| `E2E_OPERATOR_EMAIL`, `E2E_OPERATOR_PASSWORD` | `operator@example.test`, `demo-password-change-me` |

Each run adds a consent, a support session and an org to the stack; none
gets in the way of the next run.
