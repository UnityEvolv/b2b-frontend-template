import type { Api, notification } from '@b2b-template/api'
import { useEffect, useState } from 'react'

export type NotificationCategory = notification.components['schemas']['NotificationCategory']
export type ChannelChoice = notification.components['schemas']['ChannelChoice']
export type ChoiceChannel = keyof ChannelChoice

/** Every channel a choice has, in the order the grids show them. */
export const CHOICE_CHANNELS = [
  'in_app',
  'push',
  'email',
  'digest',
] as const satisfies readonly ChoiceChannel[]

/**
 * The notification categories the deployment registers, the template's and
 * the product's, with their labels: read from the notification service each
 * time a page opens, never listed here. Null while loading; empty when the
 * read failed.
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

/** The channels any of the categories may use: the grid's columns. */
export function channelsIn(categories: readonly NotificationCategory[]): ChoiceChannel[] {
  return CHOICE_CHANNELS.filter((channel) => categories.some((c) => c.channels.includes(channel)))
}

/**
 * The choices with one channel of one category switched, starting from the
 * category's defaults when nothing has been chosen for it yet.
 */
export function withChoice(
  choices: Record<string, ChannelChoice>,
  category: NotificationCategory,
  channel: ChoiceChannel,
  on: boolean,
): Record<string, ChannelChoice> {
  const current = choices[category.id] ?? category.default_channels
  return { ...choices, [category.id]: { ...current, [channel]: on } }
}
