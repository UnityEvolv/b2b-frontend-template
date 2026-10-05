import { storageKey } from '@b2b-template/product-config'
import { Alert, Button, EmptyState, toast } from '@unityevolv/unitykit'
import { displayName } from '@b2b-template/core'
import type { SessionImpersonation } from '@b2b-template/client'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useApp } from './app'
import { useOptionalSession } from '@b2b-template/client'

import { useSession } from './session'

/**
 * Support mode: a platform operator seeing an org as one of its people
 * (the backend's docs/impersonation.md, and docs/impersonation.md here).
 *
 * The platform app starts the support session (the identity service sets
 * its own cookie on the API host) and opens this app in a new tab with
 * `?support=1`. That marker, and nothing else, puts the tab in support
 * mode: `createAuth` then refreshes with the support session's endpoint,
 * opens the support session's live stream and keeps its token in memory
 * only. The tab remembers it is a support tab for as long as it is open
 * (session storage, this tab only, a flag and never a token), so a reload
 * stays in support mode instead of falling back to the operator's own
 * session.
 *
 * While it runs, the shell shows a banner that cannot be dismissed, hides
 * what a support session must not open (tokens, keys), disables every
 * submit button and refuses every form submission, and says so when the
 * API refuses a write (`impersonation.read_only`). When it ends (its time
 * box, an Owner, the operator) the tab says so and stops.
 */

/** The query parameter the platform app opens a support tab with. */
export const SUPPORT_PARAM = 'support'

const SUPPORT_KEY = storageKey('support')

/** The parts of the browser support mode reads; the real ones by default. */
export interface SupportEnvironment {
  location: { href: string }
  history?: { replaceState(data: unknown, unused: string, url?: string): void }
  sessionStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

const browser = (): SupportEnvironment | undefined =>
  typeof window === 'undefined' ? undefined : window

/**
 * Whether this tab is a support tab: opened with `?support=1`, or reloaded
 * after that. The marker is taken out of the address so a copied link is
 * never one.
 */
export function supportRequested(env: SupportEnvironment | undefined = browser()): boolean {
  if (!env) return false
  const url = new URL(env.location.href)
  if (url.searchParams.get(SUPPORT_PARAM) === '1') {
    try {
      env.sessionStorage?.setItem(SUPPORT_KEY, '1')
    } catch {
      // Without session storage a reload is an ordinary tab again; nothing is lost.
    }
    url.searchParams.delete(SUPPORT_PARAM)
    env.history?.replaceState(null, '', url.pathname + url.search + url.hash)
    return true
  }
  try {
    return env.sessionStorage?.getItem(SUPPORT_KEY) === '1'
  } catch {
    return false
  }
}

/** The tab is an ordinary one again: after its support session ended. */
export function forgetSupportRequest(env: SupportEnvironment | undefined = browser()): void {
  try {
    env?.sessionStorage?.removeItem(SUPPORT_KEY)
  } catch {
    // Nothing kept, nothing to forget.
  }
}

/** The support session this tab is, or null outside one (and outside a session at all). */
export function useSupport(): SessionImpersonation | null {
  const state = useOptionalSession()?.state
  return state?.status === 'signed-in' ? (state.session.impersonation ?? null) : null
}

/**
 * Whether the page may change anything: false in a support session. A
 * control that writes asks this and is disabled; the API refuses on its own
 * whatever the UI does.
 */
export function useReadOnly(): boolean {
  return useSupport()?.readOnly ?? false
}

/** A button that submits its form: typed so, or untyped inside a form. */
const SUBMITS = 'button[type="submit"], input[type="submit"], form button:not([type])'
const DISABLED_HERE = 'data-support-disabled'

/**
 * Disables every submit button on the page, the dialogs' too, and refuses
 * any form submission that gets through, for as long as `active`.
 */
function useReadOnlyPage(active: boolean, refused: () => void) {
  const latest = useRef(refused)
  useLayoutEffect(() => {
    latest.current = refused
  }, [refused])

  useEffect(() => {
    if (!active) return
    const disable = () => {
      for (const element of document.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        SUBMITS,
      )) {
        if (!element.disabled) {
          element.disabled = true
          element.setAttribute(DISABLED_HERE, '')
        }
      }
    }
    const submit = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      latest.current()
    }
    disable()
    const observer = new MutationObserver(disable)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'type'],
    })
    document.addEventListener('submit', submit, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('submit', submit, true)
      for (const element of document.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        `[${DISABLED_HERE}]`,
      )) {
        element.disabled = false
        element.removeAttribute(DISABLED_HERE)
      }
    }
  }, [active])
}

/** One toast at a time for refused writes, however many were refused. */
const READ_ONLY_TOAST = 'support-read-only'

/**
 * What a support tab runs beside its pages: the read-only page, the
 * refusals said once, and the end noticed (a refused refresh, or the time
 * box passing) and shown.
 */
export function SupportGuard() {
  const { t } = useTranslation()
  const { auth } = useApp()
  const { ended } = useSession()
  const support = useSupport()
  const control = auth?.support ?? null
  const readOnly = support?.readOnly ?? false

  const say = () => toast.warning(t('support.readOnlyRefused'), { id: READ_ONLY_TOAST })
  useReadOnlyPage(readOnly, say)

  const latest = useRef({ say, ended })
  useLayoutEffect(() => {
    latest.current = { say, ended }
  })

  useEffect(() => {
    if (!control) return
    const offs = [
      control.onReadOnly(() => latest.current.say()),
      control.onEnded((end) => void latest.current.ended(end)),
    ]
    return () => {
      for (const off of offs) off()
    }
  }, [control])

  // At the time box the token runs out with it; asking for one then is
  // what tells the tab it is over.
  const endsAt = support?.endsAt
  useEffect(() => {
    if (!control || !endsAt || !auth) return
    const wait = Math.max(0, Date.parse(endsAt) - Date.now()) + 1_000
    // Timers are capped at about 24.8 days; a time box is at most a day.
    const timer = setTimeout(() => void auth.getToken(), Math.min(wait, 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [auth, control, endsAt])

  return null
}

/**
 * The banner across the top of a support tab: who is being seen as, that
 * it is read-only, and until when, with the way to end it. It cannot be
 * dismissed.
 */
export function SupportBanner() {
  const { t, i18n } = useTranslation()
  const { state, signOut } = useSession()
  const support = useSupport()
  const [ending, setEnding] = useState(false)
  if (!support || state.status !== 'signed-in') return null
  const person = displayName(state.session.user)
  const time = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' }).format(
    new Date(support.endsAt),
  )
  const end = async () => {
    setEnding(true)
    try {
      await signOut()
    } finally {
      setEnding(false)
    }
  }
  return (
    <section aria-label={t('support.region')} className="sticky top-0 z-40">
      <Alert
        variant="warn"
        banner
        icon="alert"
        title={t('support.title')}
        action={
          <Button size="sm" variant="secondary" loading={ending} onClick={() => void end()}>
            {t('support.end')}
          </Button>
        }
      >
        {t(support.readOnly ? 'support.banner' : 'support.bannerWritable', {
          person,
          time,
        })}
      </Alert>
    </section>
  )
}

/** A page with no layout around it, for a support tab that has ended. */
function Standalone({ children }: { children: ReactNode }) {
  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-base-100 p-4">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  )
}

/** Why it ended, in the app's words where it has them. */
const ENDED_REASONS: Readonly<Record<string, string>> = {
  impersonation_ended: 'support.reasons.ended',
  consent_revoked: 'support.reasons.consentRevoked',
  impersonation_ended_by_owner: 'support.reasons.endedByOwner',
  support_access_withdrawn: 'support.reasons.accessWithdrawn',
  impersonation_replaced: 'support.reasons.replaced',
}

/**
 * The support session is over. Said plainly, with the server's reason, and
 * the tab offered to close; nothing else is shown, and the tab is an
 * ordinary one again on reload.
 */
export function SupportEndedPage() {
  const { t } = useTranslation()
  const { auth } = useApp()
  const end = auth?.support?.ended() ?? null
  useEffect(() => forgetSupportRequest(), [])
  const known = end ? ENDED_REASONS[end.code] : undefined
  const why = known ? t(known as never) : (end?.message ?? t('support.reasons.ended'))
  return (
    <Standalone>
      <EmptyState
        icon="lock"
        titleAs="h2"
        title={t('support.ended')}
        description={why}
        action={<Button onClick={() => window.close()}>{t('support.close')}</Button>}
        role="status"
      />
    </Standalone>
  )
}

/** A page a support session does not open: tokens and keys. */
export function SupportUnavailablePage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon="lock"
      titleAs="h2"
      title={t('support.unavailable.title')}
      description={t('support.unavailable.description')}
    />
  )
}
