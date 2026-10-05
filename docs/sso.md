# Single sign-on

An organization signs its people in through its own identity provider:
any OpenID Connect provider, or any SAML 2.0 identity provider. The
identity service owns it: the presets, the checks a save requires, what
every sign-in is checked against, the SAML attribute profiles, requiring
single sign-on and its break glass are in the backend's
[sso.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/sso.md).
This page is the frontend's half.

## Where it is managed

| app | page | who |
| --- | --- | --- |
| admin | Single sign-on, `/sso` | whoever holds `sso` (Owners, and Admins by default) |
| admin | Require single sign-on, on the same page | an Owner only |

The page is `apps/admin/src/pages/SsoPage.tsx`: `IdentityProviderSettings`
(the picker, the OpenID form and the saved provider), `SamlProviderForm`
and `SsoEnforcement`, with their strings under `admin:settings.identity`
and `admin:settings.enforcement`.

## The provider picker

The presets come from `GET /identity/v1/identity-provider-presets`, so a
preset the page has never heard of still renders from the inputs it asks
for. A preset whose `protocol` is `saml` shows the SAML form; any other the
OpenID one. Either way the settings are tested (`POST .../identity-provider/test`,
each check listed with the server's sentence) and Save is offered only
after a passing test of the values as they are now; the server tests them
again, and a 422's `fields` go beside the inputs they name.

## SAML

- **Our details first.** The entity id, ACS URL, metadata URL and NameID
  format from `GET .../identity-provider/saml-service-provider`, each with a
  copy button, shown before anything is asked for: the provider's metadata
  exists only once the admin has set these up there.
- **The metadata** by URL, or as the document (a file, read in the browser
  and capped at 1 MB, or pasted). Only the source picked is sent. With a
  provider saved and neither filled in, nothing is sent and the saved
  metadata is kept (its certificates checked again). A failed check's
  `saml.metadata_url` or `saml.metadata_xml` is put on that input.
- **The attribute mapping** is filled in from the profile picked (the
  response's `saml_profiles`: Okta, Entra ID, Google Workspace, JumpCloud,
  AD FS, OneLogin, generic) and stays editable.
- **The saved provider** shows its entity id, sign-in URL, where the
  metadata came from and its signing certificates with their ends; one
  within 30 days of it, or past it, is flagged, and a warning says when
  sign-in through the provider stops. A SAML provider is saved as
  `pending_first_sign_in`, shown as "Waiting for the first sign-in to
  confirm": it signs people in, and the first sign-in that goes through
  verifies it.

## Requiring single sign-on

A switch, "Require single sign-on for <domain>", the domain being the one
the organization has proven (`GET /organization/v1/organizations/{org_id}/domain`).
It is turned on or off after a confirmation, with
`PUT .../identity-provider/enforcement`.

- **An Owner only.** Anyone else sees it switched off, with why; the
  identity service refuses them on its own.
- **A verified provider only.** Until the provider is `active` with a
  `verified_at` it cannot be turned on (the server's 409
  `identity_provider.not_verified` is explained the same way). Turning it
  off is always offered. A requirement saved while the provider waits for
  a sign-in (new SAML metadata) is shown as not in force.
- **Break glass** is explained beside it: the organization's Owners who
  already have a second factor can still sign in with a password.

## Sign-in

While it is in force, the identity service refuses the right password
for an address in the domain with 403 `sso.required`. The web sign-in page
and the phone say so and offer "Continue with single sign-on", which goes
to `GET /identity/v1/sign-in/start?email=…` as an SSO domain does (the
system browser on the phone and in the desktop app).
