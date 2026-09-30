import type { Api, notification } from '@b2b-template/api'
import { useEffect, useState } from 'react'

export type NotificationCategory = notification.components['schemas']['NotificationCategory']
export type FeedEntry = notification.components['schemas']['FeedEntry']

/**
 * The notification categories the deployment registers, the template's and
 * the product's, with their labels: read from the notification service each
 * time a page or screen opens, never listed here. Null while loading; empty
 * when the read failed.
 */
export function useNotificationCategories(api: Api | undefined): NotificationCategory[] | null {
  const [categories, setCategories] = useState<NotificationCategory[] | null>(null)
  useEffect(() => {
    if (!api) return
    let current = true
    void api.notification
      .GET('/v1/notification-categories')
      .then(({ data }) => current && setCategories(data?.categories ?? []))
    return () => {
      current = false
    }
  }, [api])
  return categories
}

/**
 * What a feed entry is called, from the API alone: the heading the entry
 * carries, else its category's label in the registry. Null when neither says,
 * for the app's own fallback.
 */
export function feedHeading(
  entry: FeedEntry,
  categories: readonly NotificationCategory[] | null,
): string | null {
  const heading = typeof entry.data.heading === 'string' ? entry.data.heading.trim() : ''
  return heading || categories?.find((c) => c.id === entry.category)?.label || null
}

/** The registered category an entry is in, when the registry names it. */
export function categoryOf(
  entry: FeedEntry,
  categories: readonly NotificationCategory[] | null,
): NotificationCategory | undefined {
  return categories?.find((c) => c.id === entry.category)
}
