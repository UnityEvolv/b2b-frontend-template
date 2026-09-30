import type { Api, billing } from '@b2b-template/api'
import { useCallback, useEffect, useState } from 'react'

export type Billing = billing.components['schemas']['Billing']
export type Band = billing.components['schemas']['Band']
export type Invoice = billing.components['schemas']['Invoice']

/**
 * The bands an org may move to itself, as the billing service answers: every
 * band with a price, cheapest first, and the band above its own. The bands
 * are the deployment's registry; none is named here, and a contractual band
 * never has a self-serve price.
 */
export function offeredBands(account: Pick<Billing, 'band' | 'prices' | 'next_band'>): Band[] {
  const amount = (band: Band) => account.prices[band]?.amount ?? Number.MAX_SAFE_INTEGER
  const bands = new Set([
    ...Object.keys(account.prices),
    ...(account.next_band ? [account.next_band] : []),
  ])
  bands.delete(account.band)
  return [...bands].sort((a, b) => amount(a) - amount(b))
}

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
