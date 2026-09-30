import type { notification } from '@b2b-template/api'
import type { NotificationCategory } from '@b2b-template/client'

/**
 * The registry's read lives in the client, which the phone shares; the web's
 * grids add the channel helpers below.
 */
export { useNotificationCategories, type NotificationCategory } from '@b2b-template/client'
export type ChannelChoice = notification.components['schemas']['ChannelChoice']
export type ChoiceChannel = keyof ChannelChoice

/** Every channel a choice has, in the order the grids show them. */
export const CHOICE_CHANNELS = [
  'in_app',
  'push',
  'email',
  'digest',
] as const satisfies readonly ChoiceChannel[]

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
