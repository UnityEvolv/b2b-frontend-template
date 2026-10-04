# API keys and personal access tokens

Customers script against the API with a bearer token that is not a
person's session: an organization's API key, or a person's personal access
token. The identity service makes, resolves and revokes both; what they
are, how they are checked on every request, the `api_keys` permission
group and the `api_access` plan feature are in the backend's
[api-keys.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/api-keys.md).
This page is the frontend's half.

## Where they are managed

| app | page | who | lists |
| --- | --- | --- | --- |
| admin | API keys, `/api-keys` | whoever holds `api_keys` (Admins by default) | every key and personal access token in the org; revokes any |
| account | Access tokens, `/settings/tokens` | any member, for themself | their own tokens in the org they are in |

Both render `ApiKeysPanel` from `@b2b-template/ui-web` (`kind` `org` or
`personal`), with its strings under `common:apiKeys`.

## Making one

- **Permissions** are picked from the authorization service's registry
  (`GET /authorization/v1/permission-groups`), so a product's own groups
  appear with no frontend change. Only those the viewer holds now
  (`useSession().permissions.can`) are offered, never `api_keys`,
  `settings` or the registry's `owner_only`. The identity service refuses
  any other, so the picker is a convenience, not the check.
- **An end** is optional: the last day it works, sent as the end of that
  day in the viewer's time zone.
- **The token is shown once**, in a dialog with a copy button and a
  warning. It lives only in that dialog's state; closing it drops it, the
  list read again carries only the prefix, and nothing is written to
  storage, a URL, a log or error tracking.
- **Plan refusal.** Without `api_access` on the org's plan (or an
  override granting it) the service answers 403 `plan.limit_reached`. The
  admin page says so and links to Billing for whoever holds `billing`; the
  account page asks the person to see whoever manages billing.

## Revoking

Each working key has a Revoke button, which asks first. It stops working
at once, at every service; the row stays, marked revoked, with the date.
