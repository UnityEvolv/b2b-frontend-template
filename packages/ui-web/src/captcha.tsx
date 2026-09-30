/**
 * CAPTCHA for public forms (UO-75): self-serve signup, forgot password,
 * invite acceptance. A page asks for a token for its action and sends it in
 * the request header; the backend verifies it with the provider, because a
 * token checked only here proves nothing.
 *
 * reCAPTCHA v3: no puzzle, a score per request. The widget script is loaded
 * once, on the first page that needs it, never on the signed-in app. Without
 * a site key (a laptop) nothing is loaded and no token is sent; the backend
 * in local development asks for none.
 */
import { RECAPTCHA_POLICY_URLS, RECAPTCHA_SCRIPT_URL } from '@b2b-template/app-config/captcha'
import { CAPTCHA_HEADER } from '@b2b-template/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useApp } from './app'

/** The request header a public form sends the token in. The backend reads the same name. */
export { CAPTCHA_HEADER }

export interface CaptchaConfig {
  /** The public site key. Absent on a laptop, so the widget is never loaded. */
  siteKey?: string
}

/** The actions a form may name. The backend verifies the token was issued for the same one. */
export type CaptchaAction = 'signup' | 'forgot_password' | 'accept_invite'

interface Recaptcha {
  ready: (fn: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

/** The parts of the page the loader touches. `window` in the app; a fake in tests. */
export interface CaptchaEnvironment {
  document: Pick<Document, 'createElement' | 'head' | 'querySelector'>
  grecaptcha?: Recaptcha
}

let loading: Promise<Recaptcha> | null = null

/**
 * Load the widget once and resolve with it when ready. A second caller shares
 * the first load; a failed load is forgotten so the next attempt retries.
 */
export function loadCaptcha(siteKey: string, env: CaptchaEnvironment): Promise<Recaptcha> {
  if (env.grecaptcha) {
    const api = env.grecaptcha
    return new Promise((resolve) => api.ready(() => resolve(api)))
  }
  if (loading) return loading
  loading = new Promise<Recaptcha>((resolve, reject) => {
    const script = env.document.createElement('script')
    script.src = `${RECAPTCHA_SCRIPT_URL}?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.onload = () => {
      const api = env.grecaptcha
      if (!api) {
        loading = null
        reject(new Error('captcha: widget script loaded but grecaptcha is missing'))
        return
      }
      api.ready(() => resolve(api))
    }
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('captcha: widget script failed to load'))
    }
    env.document.head.appendChild(script)
  })
  return loading
}

/** Tests only: forget a load in progress. */
export function resetCaptchaLoader() {
  loading = null
}

/**
 * A token for one action, ready to send.
 *
 * `token()` resolves with the provider's token, or `''` when no site key is
 * configured. `headers()` is the same as a header object to spread into a
 * request: empty when there is nothing to send, so a laptop's request looks
 * exactly like the backend with the check off expects.
 */
export function useCaptcha(action: CaptchaAction, env?: CaptchaEnvironment) {
  const { captcha } = useApp()
  const siteKey = captcha?.siteKey
  const [state, setState] = useState<'off' | 'loading' | 'ready' | 'failed'>(
    siteKey ? 'loading' : 'off',
  )

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    loadCaptcha(siteKey, env ?? (window as unknown as CaptchaEnvironment)).then(
      () => !cancelled && setState('ready'),
      () => !cancelled && setState('failed'),
    )
    return () => {
      cancelled = true
    }
  }, [siteKey, env])

  const token = useCallback(async () => {
    if (!siteKey) return ''
    const api = await loadCaptcha(siteKey, env ?? (window as unknown as CaptchaEnvironment))
    return api.execute(siteKey, { action })
  }, [siteKey, action, env])

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    const value = await token()
    return value ? { [CAPTCHA_HEADER]: value } : {}
  }, [token])

  return useMemo(
    () => ({
      /** Whether the widget is in use at all: false on a laptop without a key. */
      enabled: Boolean(siteKey),
      /** 'ready' once the widget has loaded; a form may submit before that and wait on `token()`. */
      state,
      token,
      headers,
    }),
    [siteKey, state, token, headers],
  )
}

/**
 * The notice a page must show when the widget's badge is hidden: reCAPTCHA's
 * terms require naming it. Renders nothing when the widget is not in use.
 */
export function CaptchaNotice({ className }: { className?: string }) {
  const { captcha } = useApp()
  const { t } = useTranslation()
  if (!captcha?.siteKey) return null
  return (
    <p className={className ?? 'text-xs text-muted-foreground'} data-testid="captcha-notice">
      {t('captcha.notice')}{' '}
      <a
        href={RECAPTCHA_POLICY_URLS.privacy}
        rel="noreferrer"
        target="_blank"
        className="underline"
      >
        {t('captcha.privacy')}
      </a>{' '}
      {t('captcha.and')}{' '}
      <a href={RECAPTCHA_POLICY_URLS.terms} rel="noreferrer" target="_blank" className="underline">
        {t('captcha.terms')}
      </a>
      {t('captcha.apply')}
    </p>
  )
}
