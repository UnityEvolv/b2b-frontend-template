# Webhooks

An organization's admins register endpoints, and the product sends them
signed HTTP requests when something happens in the org. The webhooks
service owns it: the event types, the delivery format, how a receiver
verifies a signature, retries, the `webhooks` permission group and the
`webhooks` plan feature are in the backend's
[webhooks.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/webhooks.md).
This page is the frontend's half.

## Where they are managed

| app | page | who |
| --- | --- | --- |
| admin | Webhooks, `/webhooks` | whoever holds `webhooks` (Admins by default) |

The page is `apps/admin/src/webhooks`, with its strings under
`admin:webhooks`. It calls the `webhooks` client in `@b2b-template/api`:
`/webhooks` under `VITE_API_ORIGIN` when deployed, `VITE_API_ORIGIN_WEBHOOKS`
(the compose stack's 8087) on a laptop.

## Endpoints

- **Event types** come from `GET .../webhook-event-types`, so a product's
  own types appear with no frontend change. None ticked is every type,
  including ones registered later.
- **The signing secret is shown once**, after adding an endpoint and after
  rotating its secret, in a dialog with a copy button and a warning. It
  lives only in that dialog's state; closing it drops it, and nothing
  writes it to storage, a URL, a log or error tracking.
- **Rotating** asks for the overlap, 0 to 168 hours (24 by default), during
  which the old secret signs beside the new one.
- **Edit, turn on or off, delete** (after asking) and **send a test**. A
  test's result is said in a toast and appears in the deliveries.
- **Refusals.** A 400's `fields` (`url`, `description`, `event_types`) go
  beside their inputs; `webhooks.endpoint_limit` (409) says the org is at
  its cap.

## Deliveries

Newest first, filtered by endpoint and status, a page at a time ("Load
more" follows `next_cursor`). One opens in a drawer with the payload sent
and every attempt (when, automatic or by an admin, status code, latency,
error), and is resent from there.

## On a plan without webhooks

The event types answer `available: false` and `required_plan`; a write the
service refuses answers 403 `plan.limit_reached`. Either way the page
names the plan that has webhooks, links to Billing for whoever holds
`billing` (or asks them to see whoever does), and disables Add, Send test
and Resend. Editing, turning off, rotating and deleting stay, as the
service allows them on any plan.
