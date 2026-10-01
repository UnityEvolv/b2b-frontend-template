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

/** A feed entry in words, as an app shows it. */
export interface FeedWords {
  /** The heading, or null when neither the entry nor the registry says, for the app's own fallback. */
  heading: string | null
  /** The sentence under it; empty when there is none. */
  line: string
  /**
   * Whether the heading is the server's, which counts a batch itself; a
   * category's label does not, so the app adds the count.
   */
  counted: boolean
}

/**
 * What a feed entry says, from the API alone: the heading and line the
 * notification service renders from the category's copy. Only when the
 * heading is empty is the entry named by its category's label in the
 * registry.
 */
export function feedWords(
  entry: FeedEntry,
  categories: readonly NotificationCategory[] | null,
): FeedWords {
  const heading = entry.heading.trim()
  const line = entry.line.trim()
  if (heading) return { heading, line, counted: true }
  return { heading: categoryOf(entry, categories)?.label || null, line, counted: false }
}

/** The registered category an entry is in, when the registry names it. */
export function categoryOf(
  entry: FeedEntry,
  categories: readonly NotificationCategory[] | null,
): NotificationCategory | undefined {
  return categories?.find((c) => c.id === entry.category)
}
