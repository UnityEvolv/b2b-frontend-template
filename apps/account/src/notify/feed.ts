import type { Api, notification } from '@b2b-template/api'
import type { DesktopNotice } from '@b2b-template/ui-web'
import { useCallback, useEffect, useRef, useState } from 'react'

export type Entry = notification.components['schemas']['FeedEntry']
export type Category = notification.components['schemas']['Category']

/** The feed is read from the notification API again this often. */
export const POLL_MS = 60_000

/**
 * The feed and its unread count, from the notification API: loaded on open,
 * again every minute, and after the person reads something. No socket: a
 * new entry shows on the next poll.
 */
export function useFeed(api: Api | undefined, orgId: string | undefined, filter: Category | null) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [next, setNext] = useState<string | null>(null)
  const current = useRef(0)

  const load = useCallback(async () => {
    if (!api || !orgId) return
    const ask = ++current.current
    const { data } = await api.notification.GET('/v1/organizations/{org_id}/notifications', {
      params: {
        path: { org_id: orgId },
        query: { ...(filter ? { category: filter } : {}), limit: 30 },
      },
    })
    if (!data || ask !== current.current) return
    setEntries(data.entries)
    setUnread(data.unread)
    setNext(data.next_cursor ?? null)
  }, [api, orgId, filter])

  const more = useCallback(async () => {
    if (!api || !orgId || !next) return
    const { data } = await api.notification.GET('/v1/organizations/{org_id}/notifications', {
      params: {
        path: { org_id: orgId },
        query: { ...(filter ? { category: filter } : {}), cursor: next, limit: 30 },
      },
    })
    if (!data) return
    setEntries((all) => [...(all ?? []), ...data.entries])
    setNext(data.next_cursor ?? null)
  }, [api, orgId, filter, next])

  useEffect(() => {
    const first = setTimeout(() => void load(), 0)
    const timer = setInterval(() => void load(), POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  const read = useCallback(
    async (body: { ids?: string[]; all?: boolean; about?: string }) => {
      if (!api || !orgId) return
      const { data } = await api.notification.POST(
        '/v1/organizations/{org_id}/notifications/read',
        {
          params: { path: { org_id: orgId } },
          body,
        },
      )
      if (data) setUnread(data.unread)
      setEntries((all) =>
        (all ?? []).map((e) => (body.all || body.ids?.includes(e.id) ? { ...e, read: true } : e)),
      )
    },
    [api, orgId],
  )

  return { entries, unread, more: next ? more : null, read, reload: load }
}

/** A link from the feed that stays inside the app, or the home page. */
export function entryPath(link: string): string {
  return link.startsWith('/') && !link.startsWith('//') && !link.includes('\\') ? link : '/'
}

/**
 * The system notifications new feed entries make in the desktop app: each
 * unread entry not seen before, with its summary as the title.
 */
export function desktopNotices(
  entries: readonly Entry[],
  seen: ReadonlySet<string>,
  summary: (entry: Entry) => string,
  body: string,
): DesktopNotice[] {
  return entries
    .filter((e) => !e.read && !seen.has(e.id))
    .map((e) => ({ title: summary(e), body, path: entryPath(e.link) }))
}
