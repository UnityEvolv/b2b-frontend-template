# Onboarding checklist

A new organization's Owner is guided through setup by a checklist. The
organization service owns it: the steps (the core's and the product's),
how each is derived from real data when it is read, the dismissals and who
may see and change them are in the backend's
[onboarding.md](https://github.com/UnityEvolv/b2b-backend-template/blob/main/docs/onboarding.md).
This page is the frontend's half.

## The checklist

`OnboardingChecklist` (`apps/admin/src/onboarding`) sits at the top of the
admin app's start page (Users), for whoever holds `settings`; nobody else
asks for it. It reads `GET /organization/v1/organizations/{org_id}/onboarding`
when the page opens and again after each change, and keeps nothing.

- **Every step comes from the service**, the product's too, in its order,
  with its `label`. The frontend has no list of them, so a product's step
  appears with no frontend change.
- **State:** done (ticked), not yet, or "could not check" when `unknown`
  (the service that knows did not answer in time; never shown as done),
  with **Check again** to read it once more. "*n* of *m* done" counts a
  hidden step as done, as `complete` does.
- **Where it is done:** `href` is a path in the web app `app`. In this app
  it is a route; in another it is that app's address from the build
  (`VITE_<APP>_ORIGIN`, `appOriginsFromEnv` and `useAppLink` in
  `@b2b-template/ui-web`). An app this build has no address for is not
  linked: the step is still shown, without the link. A done step has no
  link.
- **Hiding:** each step can be hidden and shown again (a disclosure lists
  the hidden ones), and the whole checklist hidden. Hiding is the org's,
  for every admin, and audited. A hidden checklist comes back from the
  Settings page (**Show the setup checklist again**) while anything is left.
- **Gone** when `complete` (every step done or hidden, none unknown) or
  `dismissed`.
- **In a support session** it is shown as the person would see it, with
  nothing to hide or show (`useReadOnly`).

## Empty states

The core admin pages link to their step (`SetupHint`), so a hidden
checklist still leaves the way in. They do not read the checklist: the
core's steps and their pages are fixed (`CORE_STEPS`).

| page | when | links to |
| --- | --- | --- |
| Users | only the person themself, nothing filtered, and they may invite | `/users/invite` (invite your teammates) |
| Settings | no verified domain | the domain card (verify your domain) |
| Single sign-on | no identity provider saved | the provider form (set up single sign-on) |
| Billing | on the ladder's lowest band and not trying another | the plan card (choose a plan) |

On the step's own page the link jumps to the part of it where the step is
done (the element whose id is the step's).

## A product's step

Registered on the backend, with its `app` and `href`. The frontend needs
only the app's address in the admin build, `VITE_<APP>_ORIGIN` (the example
product's is `VITE_PROJECTS_ORIGIN`), for the step to link there.
