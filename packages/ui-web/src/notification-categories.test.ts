import { describe, expect, it } from 'vitest'

import { channelsIn, withChoice, type NotificationCategory } from './notification-categories'

const category = (
  id: string,
  channels: NotificationCategory['channels'],
): NotificationCategory => ({
  id,
  label: id,
  description: '',
  audience: 'member',
  default_channels: { in_app: true, push: false, email: false, digest: true },
  channels,
  quiet_hours: true,
  batched: false,
})

describe('the notification grid', () => {
  it('has a column for each channel some category may use, in the grid’s order', () => {
    expect(channelsIn([category('a', ['email', 'in_app']), category('b', ['digest'])])).toEqual([
      'in_app',
      'email',
      'digest',
    ])
    expect(channelsIn([])).toEqual([])
  })

  it('switches one channel, starting from the category’s defaults', () => {
    const c = category('security', ['in_app', 'push'])
    expect(withChoice({}, c, 'push', true)).toEqual({
      security: { in_app: true, push: true, email: false, digest: true },
    })
    const chosen = { security: { in_app: false, push: false, email: true, digest: false } }
    expect(withChoice(chosen, c, 'in_app', true).security).toEqual({
      in_app: true,
      push: false,
      email: true,
      digest: false,
    })
  })
})
