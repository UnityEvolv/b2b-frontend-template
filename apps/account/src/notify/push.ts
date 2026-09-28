import type { Api } from '@b2b-template/api'

/**
 * Web push on this browser (UO-176): the service worker, a subscription to
 * our own VAPID key, and the device registered for the person's session.
 * Everything here may be missing: a browser without push, a private window,
 * a person who said no. None of it is needed for the app to work.
 */

const WORKER = '/sw.js'

export type PushState = 'unsupported' | 'off' | 'on' | 'blocked' | 'unavailable'

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded =
    base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Whether this browser gets pushes now. */
export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const registration = await navigator.serviceWorker.getRegistration(WORKER)
  const sub = await registration?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

/** Ask, subscribe and register this browser. */
export async function enablePush(api: Api, orgId: string): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const { data: config } = await api.notification.GET('/v1/push-config')
  if (!config?.enabled || !config.vapid_public_key) return 'unavailable'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const registration = await navigator.serviceWorker.register(WORKER)
  await navigator.serviceWorker.ready
  const sub =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(config.vapid_public_key),
    }))
  const { error } = await api.notification.POST('/v1/organizations/{org_id}/devices', {
    params: {
      path: { org_id: orgId },
      header: { 'Idempotency-Key': globalThis.crypto.randomUUID() },
    },
    body: { platform: 'web', token: JSON.stringify(sub.toJSON()) },
  })
  return error ? 'unavailable' : 'on'
}

/** Stop pushes to this browser. */
export async function disablePush(api: Api, orgId: string): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const registration = await navigator.serviceWorker.getRegistration(WORKER)
  const sub = await registration?.pushManager.getSubscription()
  if (sub) {
    await api.notification.POST('/v1/organizations/{org_id}/devices/unregister', {
      params: { path: { org_id: orgId } },
      body: { token: JSON.stringify(sub.toJSON()) },
    })
    await sub.unsubscribe()
  }
  return 'off'
}
