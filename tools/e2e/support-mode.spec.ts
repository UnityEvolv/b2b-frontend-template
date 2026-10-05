/**
 * Support mode end to end (docs/impersonation.md): an Owner consents in the
 * admin app, a platform operator opens a support tab as one of the org's
 * people, the tab is read-only and marked, and it ends the moment the
 * Owner withdraws the consent. Needs the backend's local stack, seeded, with
 * a bootstrap operator (README.md here).
 */
import { expect, test, type Page } from '@playwright/test'

import { signIn, signInOperator, stack } from './stack'

test('an Owner consents, support views as a member read-only, and the withdrawal ends it', async ({
  browser,
}) => {
  // The Owner gives a 15-minute consent.
  const owner = await (await browser.newContext()).newPage()
  await signIn(owner, stack.admin, stack.owner, stack.password)
  await owner.waitForURL((url) => !url.pathname.startsWith('/sign-in'))
  await owner.goto(`${stack.admin}/support-access`)
  await owner.getByLabel('For', { exact: true }).selectOption('15')
  const given = owner.waitForResponse(
    (r) => r.url().endsWith('/impersonation-grants') && r.request().method() === 'POST',
  )
  await owner.getByRole('button', { name: 'Give consent' }).click()
  expect((await given).status()).toBe(201)

  // The operator opens the org and views as its member.
  const operator = await signInOperator(browser)
  await operator.getByText('Demo Co', { exact: true }).click()
  await expect(
    operator.getByRole('heading', { name: 'Support sessions', exact: true }),
  ).toBeVisible()
  const popup = operator.context().waitForEvent('page')
  await operator.getByRole('button', { name: /^View as Mona Member/ }).click()
  const tab = await popup

  // Marked, with the person and the end.
  const banner = tab.getByRole('region', { name: 'Support session' })
  await expect(banner).toContainText('You are viewing as Mona Member')
  await expect(banner).toContainText('Read-only')
  expect(new URL(tab.url()).origin).toBe(new URL(stack.account).origin)
  const cookies = await tab.context().cookies(stack.api)
  expect(cookies.some((c) => c.name.endsWith('_impersonation') && c.httpOnly)).toBe(true)

  // Reads work; writes are disabled, and refused by the API when forced.
  await expect(tab.getByRole('heading', { name: 'Your profile' })).toBeVisible()
  await expect(tab.locator('button[type="submit"]').first()).toBeDisabled()
  const token = await bearerOf(tab)
  const forced = await tab.evaluate(
    async ({ api, token }) => {
      const r = await fetch(`${api}/user/v1/me/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Changed by support' }),
      })
      return { status: r.status, body: (await r.json()) as { code?: string } }
    },
    { api: stack.api, token },
  )
  expect(forced.status).toBe(403)
  expect(forced.body.code).toBe('impersonation.read_only')

  // Tokens are never shown.
  await tab.goto(`${stack.account}/settings/tokens`)
  await expect(tab.getByText('Not available in a support session')).toBeVisible()

  // The operator's own session is untouched.
  await operator.reload()
  await expect(
    operator.getByRole('heading', { name: 'Support sessions', exact: true }),
  ).toBeVisible()
  await expect(
    operator.getByRole('table', { name: 'Past and active support sessions' }),
  ).toContainText('Mona Member')

  // The Owner withdraws the consent: the tab is told at once.
  await owner.reload()
  await owner
    .getByRole('button', { name: /^Withdraw the consent/ })
    .first()
    .click()
  await expect(tab.getByText('Support session ended')).toBeVisible({ timeout: 5_000 })
  await expect(tab.getByText('An Owner of the organization withdrew their consent.')).toBeVisible()

  // And the org's audit log has the session, each request and its end.
  const actions = await auditActions(owner)
  for (const action of ['impersonation.started', 'impersonation.request', 'impersonation.ended']) {
    expect(actions).toContain(action)
  }
})

/** The support tab's access token, from the next API request it makes. */
async function bearerOf(tab: Page): Promise<string> {
  const request = tab.waitForRequest((r) => !!r.headers()['authorization'])
  await tab.reload()
  return (await request).headers()['authorization']!.replace(/^Bearer /, '')
}

/** The actions in the Owner's org's audit log, newest first. */
async function auditActions(owner: Page): Promise<string[]> {
  return owner.evaluate(async (api) => {
    const refreshed = await fetch(`${api}/identity/v1/session/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const { access_token, org_id } = (await refreshed.json()) as {
      access_token: string
      org_id: string
    }
    const events = await fetch(`${api}/audit/v1/organizations/${org_id}/audit-events?limit=200`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const body = (await events.json()) as { events: { action: string }[] }
    return body.events.map((e) => e.action)
  }, stack.api)
}
