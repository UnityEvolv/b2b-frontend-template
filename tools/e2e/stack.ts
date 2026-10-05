/**
 * The running stack the end-to-end tests drive, and the few things they do
 * over and over: sign in, read a link from the mail catcher, make a
 * one-time code. Every address is a setting, defaulting to the backend's
 * local stack (docs/local-dev.md there).
 */
import { createHmac } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Browser, type Page } from '@playwright/test'

const setting = (name: string, fallback: string) => process.env[name] || fallback

export const stack = {
  account: setting('E2E_ACCOUNT_URL', 'http://localhost:5173'),
  admin: setting('E2E_ADMIN_URL', 'http://localhost:5174'),
  platform: setting('E2E_PLATFORM_URL', 'http://localhost:5175'),
  api: setting('E2E_API_URL', 'http://localhost:8000'),
  mail: setting('E2E_MAIL_URL', 'http://localhost:8025'),
  /** The seed's password for every Demo Co person. */
  password: setting('E2E_PASSWORD', 'demo-password-change-me'),
  owner: setting('E2E_OWNER_EMAIL', 'owner@demo.example.test'),
  /** BOOTSTRAP_OPERATOR_EMAIL in the backend's deploy/.env. */
  operator: setting('E2E_OPERATOR_EMAIL', 'operator@example.test'),
  operatorPassword: setting('E2E_OPERATOR_PASSWORD', 'demo-password-change-me'),
}

// --- One-time codes (RFC 6238), for the platform's required second factor.

function base32(secret: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of secret.replace(/[\s=]/g, '').toUpperCase()) {
    const value = alphabet.indexOf(char)
    if (value < 0) throw new Error('not a base32 key')
    bits += value.toString(2).padStart(5, '0')
  }
  const bytes = bits.match(/.{8}/g) ?? []
  return Buffer.from(bytes.map((b) => parseInt(b, 2)))
}

export function totp(secret: string, at = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)))
  const mac = createHmac('sha1', base32(secret)).update(counter).digest()
  const offset = mac[mac.length - 1]! & 0xf
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(code).padStart(6, '0')
}

// --- The platform operator: invited by the identity service on its first
// start, set up once here and remembered for the next run.

const here = dirname(fileURLToPath(import.meta.url))
const OPERATOR_FILE = join(here, '.auth', 'operator.json')

interface Operator {
  secret: string
  /** The last code used: the identity service takes each code once. */
  lastCode?: string
}

function readOperator(): Operator | null {
  const secret = process.env.E2E_OPERATOR_TOTP_SECRET
  if (secret) return { secret }
  return existsSync(OPERATOR_FILE)
    ? (JSON.parse(readFileSync(OPERATOR_FILE, 'utf8')) as Operator)
    : null
}

function writeOperator(operator: Operator) {
  mkdirSync(dirname(OPERATOR_FILE), { recursive: true })
  writeFileSync(OPERATOR_FILE, JSON.stringify(operator))
}

/** A fresh code: the next window when the current one was used already. */
async function freshCode(operator: Operator): Promise<string> {
  while (totp(operator.secret) === operator.lastCode) await new Promise((r) => setTimeout(r, 1000))
  operator.lastCode = totp(operator.secret)
  if (!process.env.E2E_OPERATOR_TOTP_SECRET) writeOperator(operator)
  return operator.lastCode
}

// --- The mail catcher.

interface MailSummary {
  ID: string
  Created: string
}

/** The newest link to `page` mailed to `address` since `since`, waiting for it. */
export async function mailedLink(address: string, page: string, since = 0): Promise<string> {
  const pattern = new RegExp(`(https?://\\S+/${page}\\?token=[^\\s"&<]+)`)
  for (let i = 0; i < 30; i++) {
    const search = `${stack.mail}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`
    const list = (await (await fetch(search)).json()) as { messages: MailSummary[] }
    for (const m of list.messages) {
      if (Date.parse(m.Created) < since) continue
      const message = (await (await fetch(`${stack.mail}/api/v1/message/${m.ID}`)).json()) as {
        Text: string
      }
      const found = pattern.exec(message.Text)?.[1]
      if (found) return found
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`no ${page} email to ${address}`)
}

// --- Signing in.

/** Through the app's own sign-in page: address, password, and a code when asked. */
export async function signIn(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/`)
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

/** Accepts an invite, verifies the address and sets the password. */
export async function joinFromInvite(page: Page, email: string, name: string, password: string) {
  await page.goto(await mailedLink(email, 'accept-invite'))
  await page.getByLabel('Your name').fill(name)
  const since = Date.now() - 2000
  await page.getByRole('button', { name: 'Accept the invitation' }).click()
  await expect(page.getByText(/sent you an email/)).toBeVisible()
  await page.goto(await mailedLink(email, 'verify-email', since))
  await page.getByLabel('New password').fill(password)
  await page.getByLabel('Repeat it').fill(password)
  await page.getByRole('button', { name: 'Save password' }).click()
  await page.waitForURL(/sign-in/)
}

/**
 * The platform operator signed in to the platform app, with their second
 * factor. On a stack where they have never signed in, they first accept the
 * bootstrap invite and set up an authenticator, whose key is kept in
 * `.auth/operator.json` (or given as E2E_OPERATOR_TOTP_SECRET).
 */
export async function signInOperator(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage()
  let operator = readOperator()
  if (!operator) {
    await joinFromInvite(page, stack.operator, 'Opal Operator', stack.operatorPassword)
    await signIn(page, stack.platform, stack.operator, stack.operatorPassword)
    await page
      .getByRole('link', { name: 'Set up an authenticator' })
      .or(page.getByRole('button', { name: 'Set up an authenticator' }))
      .first()
      .click()
    await page.getByText('Cannot scan? Enter this key instead').click()
    const key = /\b([A-Z2-7]{16,})\b/.exec(
      (await page.locator('main').innerText()).replace(/ /g, ''),
    )?.[1]
    if (!key) throw new Error('no authenticator key on the page')
    operator = { secret: key }
    await page.getByLabel('Code from the app').fill(await freshCode(operator))
    await page.getByRole('button', { name: 'Confirm' }).click()
    await page.getByLabel('I have saved these codes somewhere safe').check()
  }
  await signIn(page, stack.platform, stack.operator, stack.operatorPassword)
  await page.getByRole('textbox', { name: /^Code/ }).fill(await freshCode(operator))
  await page.getByRole('button', { name: /sign in|continue|verify/i }).click()
  await page.waitForURL(/\/organizations/)
  return page
}
