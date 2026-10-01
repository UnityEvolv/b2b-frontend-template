import { describe, expect, it } from 'vitest'

import { categoryOf, feedHeading, type FeedEntry, type NotificationCategory } from './notifications'

const category = (id: string, label: string): NotificationCategory => ({
  id,
  label,
  description: '',
  audience: 'member',
  default_channels: { in_app: true, push: false, email: false, digest: false },
  channels: ['in_app'],
  quiet_hours: false,
  batched: false,
})

const entry = (category: string, data: Record<string, unknown> = {}): FeedEntry => ({
  id: 'e-1',
  category,
  kind: 'updated',
  heading: '',
  line: '',
  data,
  link: '/',
  count: 1,
  items: [],
  occurred_at: '2026-10-01T09:00:00Z',
  read: false,
})

describe('feed headings', () => {
  const registry = [
    category('security', 'Security'),
    category('project_updates', 'Project updates'),
  ]

  it('names an entry by its own heading, else by its registered category', () => {
    expect(
      feedHeading(entry('project_updates', { heading: 'Apollo was archived' }), registry),
    ).toBe('Apollo was archived')
    expect(feedHeading(entry('project_updates'), registry)).toBe('Project updates')
    expect(categoryOf(entry('project_updates'), registry)?.label).toBe('Project updates')
  })

  it('says nothing for a category the registry does not name, or before it loads', () => {
    expect(feedHeading(entry('retired'), registry)).toBeNull()
    expect(feedHeading(entry('security'), null)).toBeNull()
  })
})
