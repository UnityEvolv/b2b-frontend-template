# Support impersonation

Platform staff troubleshoot by seeing an organization as one of its people:
the same pages, the same data, read-only, for a time box an Owner agreed
to. The identity service owns it: consent and standing support access,
what a support session may do, the audit of every request and how it ends
are in the backend's
[impersonation.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/impersonation.md).
This page is the frontend's half.

## Where it is

| app | page | who |
| --- | --- | --- |
| platform | an organization's page, Support sessions | platform staff (the app admits nobody else) |
| admin | Support access, `/support-access` | `settings` to see it; an Owner to change anything |
| admin, account | any page, in a support tab | the support session, read-only |

## Starting one: the platform app

The organization page lists the org's open consents and its standing
support access (`GET /identity/v1/platform/impersonation-grants`, filtered
to the org), every active member with what would let support see as them,
and the org's past and active support sessions
(`GET /identity/v1/organizations/{org_id}/impersonations`).

- **Who may be seen as** follows the identity service's rule
  (`wayIn` in `apps/platform/src/pages/support.ts`): an open consent, the
  one lasting longest, or else standing access; an Owner only when the
  consent or the standing access includes Owners. "View as" is disabled
  otherwise. The server checks it all again.
- **View as** opens a blank tab at once (so the browser does not block it
  after the request), starts the session with
  `POST /identity/v1/platform/impersonations` and `credentials: 'include'`
  (the identity service sets the support cookie, `<prefix>_impersonation`,
  on the API host, apart from the operator's own session), then points the
  tab at the person's app with `?support=1`: the admin app for an Owner,
  Admin or Billing Admin, the account app for anyone else. The tab's
  `opener` is cleared. If the start is refused the tab is closed and the
  refusal shown in the server's words.
- **The token the start answers with is not kept.** The platform page
  never uses it; the support tab gets its own from the support refresh.
- The apps' addresses come from the build: `VITE_ADMIN_ORIGIN` and
  `VITE_ACCOUNT_ORIGIN` (`appOriginsFromEnv` in `@b2b-template/ui-web`).
  An app with no address is not offered.
- The platform app itself is never a support tab (`support: false` in its
  `createAuth`), whatever its address says.

## Support mode: the tab

`createAuth` in `@b2b-template/ui-web` treats a tab opened with
`?support=1` as a support session (`supportRequested` in
`packages/ui-web/src/support.tsx`). The marker leaves the address at once,
so a copied link is never one, and the tab keeps a flag in session storage
(this tab only, `storageKey('support')`) so a reload stays in support mode.
The flag is all that is kept: never a token.

In support mode the shared client (`createAuth` in `@b2b-template/client`):

- refreshes with `POST /identity/v1/session/impersonation/refresh` instead
  of `/v1/session/refresh`, and before every request, since the refresh is
  what finds out the session ended. The token is held in memory only, as
  every access token is.
- reads the answer's `impersonation` marker into the session
  (`session.impersonation`: `id`, `impersonatorId`, `grantId`, `endsAt`,
  `readOnly`). A support tab is marked even if a marker were missing, and is
  read-only unless the marker says otherwise.
- opens the live stream at `/identity/v1/session/events?impersonation=true`.
- writes nothing of the person's to the device (no preferences cache), and
  saves no preference on the server: a theme chosen lasts as long as the tab.
- never touches the operator's own session: signing out ends the support
  session (`POST /identity/v1/session/impersonation/end`), the org switcher
  lists nothing and cannot switch, and the app's `roles` and `orgs` checks
  are not applied (the platform chose the app by the person's role).

The shell (`AppLayout`) then:

- shows a banner across the top that cannot be dismissed: "You are viewing
  as *person* for support. Read-only: nothing can be changed. Ends at
  *time*.", with **End session**.
- disables every submit button on the page, dialogs included, and refuses
  any form submission that gets through. `useReadOnly()` is true, for a
  control that writes without a form. Support access and the onboarding
  checklist ask it; elsewhere a button outside a form stays enabled, and
  what it writes is refused and said as below.
- says "A support session can look but not change anything" when the API
  refuses a write with 403 `impersonation.read_only`, once at a time however
  many were refused. A page's own error for it is not needed.
- hides what a support session never opens: a route or account menu entry
  with `support: false` has no nav entry and its page says it is not
  available. The template marks API keys (admin), access tokens (account)
  and the person's own second factor (both).
- notices the end and says "Support session ended", with the reason in the
  app's words where it has them (`consent_revoked`,
  `impersonation_ended_by_owner`, `support_access_withdrawn`,
  `impersonation_replaced`, `impersonation_ended`) and in the server's
  `message` otherwise, and offers to close the tab. Nothing else is shown,
  and the tab's flag is dropped. The end is noticed from a live
  `session.revoked`, a 401 `impersonation.ended` on the refresh, or the time
  box passing (the tab asks for a token at `endsAt`, which the refresh
  refuses).

A product's own pages get all of this from the shell. A page whose writes
are not forms disables them with `useReadOnly()`; a page that must never be
seen by support declares its route with `support: false`. Hiding is a
courtesy: the API refuses every write from a support session on its own.

## Consent: the admin app

Support access (`apps/admin/src/support`) is under the settings
permission, as the identity service reads it. Everything on it is the
Owner's alone (`role === 'owner'`), and never a support session's:

- **Standing support access**, on or off, and whether it includes Owners
  (`GET`/`PUT .../support-access`). Owners are a choice within standing
  access; turning it off takes them out too.
- **Consent**: give one for 15 minutes to 24 hours, Owners included or not
  (`POST .../impersonation-grants`, `duration_minutes` 15 to 1440). The list
  shows each consent with who gave it, until when, and whether it is open,
  withdrawn or ended; an open one can be withdrawn (`DELETE`), which ends
  every session under it.
- **Support sessions**: who from support saw the org as whom, under what,
  and whether it is still running; a running one can be ended now
  (`DELETE .../impersonations/{id}`). What each one did is in the audit log
  (`impersonation.request`, the session as its target).

An Admin sees the same page with nothing to change.
