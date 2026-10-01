import type { Api, billing } from '@b2b-template/api'
import { useCallback, useEffect, useState } from 'react'

export type Billing = billing.components['schemas']['Billing']
export type Band = billing.components['schemas']['Band']
export type Invoice = billing.components['schemas']['Invoice']

/**
 * The bands an org may move to itself, as the billing service lists them:
 * lowest first, the lowest (unpriced) band too, so a downgrade to it is
 * offered, and never the band it is on. The bands are the deployment's
 * registry; none is named here, and billing never lists a contractual one.
 * With no payment provider configured nothing priced can be bought, so only
 * the lowest band is offered (the service refuses the others).
 */
export function offeredBands(
  account: Pick<Billing, 'band' | 'bands' | 'next_band' | 'provider_configured'>,
): Band[] {
  if (!account.provider_configured)
    return account.bands.slice(0, 1).filter((b) => b !== account.band)
  const bands = [...account.bands]
  if (account.next_band && !bands.includes(account.next_band)) bands.push(account.next_band)
  return bands.filter((b) => b !== account.band)
}

/** The billing service's code for a priced change asked of a deployment with no payment provider. */
export const PROVIDER_NOT_CONFIGURED = 'billing.provider_not_configured'

/** Minor units as money, in the reader's language. */
export function money(amount: number, currency: string, language: string): string {
  try {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

/** Whole days from now until at, never below zero. */
export function daysUntil(at: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(at).getTime() - now) / 86_400_000))
}

/**
 * The org's billing account, read fresh: a change made elsewhere
 * (a webhook, another admin) shows the next time it is read, and on focus.
 */
export function useBilling(api: Api | undefined, orgId: string | undefined, enabled: boolean) {
  const [account, setAccount] = useState<Billing | null>(null)
  const [failed, setFailed] = useState(false)

  const reload = useCallback(async () => {
    if (!api || !orgId || !enabled) return
    const { data } = await api.billing.GET('/v1/organizations/{org_id}/billing', {
      params: { path: { org_id: orgId } },
    })
    if (data) setAccount(data)
    else setFailed(true)
  }, [api, orgId, enabled])

  useEffect(() => {
    const first = setTimeout(() => void reload(), 0)
    const onFocus = () => void reload()
    globalThis.addEventListener('focus', onFocus)
    return () => {
      clearTimeout(first)
      globalThis.removeEventListener('focus', onFocus)
    }
  }, [reload])

  return { account, setAccount, failed, reload }
}
