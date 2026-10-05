/**
 * The setup checklist end to end (docs/onboarding.md): a platform operator
 * makes an org, its new Owner sees the checklist on the admin app's start
 * page, invites a teammate and sees the step done, hides and shows a step
 * and the whole checklist. Needs the backend's local stack with a bootstrap
 * operator (README.md here).
 */
import { expect, test } from '@playwright/test'

import { joinFromInvite, signIn, signInOperator, stack } from './stack'

test('a new Owner works through the setup checklist', async ({ browser }) => {
  const run = Date.now().toString(36)
  const email = `owner-${run}@fresh-${run}.example.test`

  const operator = await signInOperator(browser)
  await operator
    .getByRole('link', { name: 'Create organization' })
    .or(operator.getByRole('button', { name: 'Create organization' }))
    .first()
    .click()
  await operator.getByLabel('Organization name').fill(`Fresh ${run}`)
  await operator.getByLabel('First admin’s email').fill(email)
  await operator.getByRole('button', { name: 'Create and send invite' }).click()
  await expect(operator.getByText('Organization created')).toBeVisible()

  const page = await (await browser.newContext()).newPage()
  await joinFromInvite(page, email, 'Fiona Fresh', stack.password)
  await signIn(page, stack.admin, email, stack.password)
  const checklist = page.locator('.card', { hasText: 'Set up your organization' })
  const step = (label: string) => checklist.getByRole('listitem').filter({ hasText: label })

  // Nothing done yet: the Owner's own invite is not a teammate's.
  await expect(checklist).toContainText('0 of')
  for (const label of [
    'Verify your domain',
    'Invite your teammates',
    'Set up single sign-on',
    'Choose a plan',
  ]) {
    await expect(step(label)).toContainText('Not yet')
  }
  await expect(page.getByRole('link', { name: 'Go to: Invite your teammates' })).toHaveAttribute(
    'href',
    '/users/invite',
  )
  await page.getByRole('link', { name: 'Go to: Set up single sign-on' }).click()
  await expect(page).toHaveURL(/\/sso$/)

  // Inviting a teammate is the step done, read again from the org's data.
  await page.goto(`${stack.admin}/users/invite`)
  await page.getByLabel('Email addresses').fill(`mate-${run}@fresh-${run}.example.test`)
  await page.getByRole('button', { name: 'Check these addresses' }).click()
  await page.getByRole('button', { name: /^Send 1 invitation/ }).click()
  await expect(page.getByRole('table')).toContainText(`mate-${run}@`)
  await page.goto(`${stack.admin}/`)
  await expect(step('Invite your teammates')).toContainText('Done')

  // A step hidden and shown again.
  await page.getByRole('button', { name: 'Hide the step: Set up single sign-on' }).click()
  await expect(step('Set up single sign-on')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: '1 hidden step' }).click()
  await page.getByRole('button', { name: 'Show the step again: Set up single sign-on' }).click()
  await expect(step('Set up single sign-on')).toContainText('Not yet')

  // The whole checklist hidden, and brought back from the settings page.
  await page.getByRole('button', { name: 'Hide the checklist' }).click()
  await expect(checklist).toHaveCount(0)
  await page.goto(`${stack.admin}/settings`)
  await page.getByRole('button', { name: 'Show the setup checklist again' }).click()
  await page.goto(`${stack.admin}/`)
  await expect(checklist).toBeVisible()
})
