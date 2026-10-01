import { describe, expect, it } from 'vitest'

import { categoryOf, feedWords, type FeedEntry, type NotificationCategory } from './notifications'

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

const entry = (category: string, heading = '', line = ''): FeedEntry => ({
  id: 'e-1',
  category,
  kind: 'updated',
  heading,
  line,
  data: {},
  link: '/',
  count: 1,
  items: [],
  occurred_at: '2026-10-01T09:00:00Z',
  read: false,
})

describe('feed words', () => {
  const registry = [
    category('security', 'Security'),
    category('project_updates', 'Project updates'),
  ]

  it('says an entry in the words the server renders, a batch counted by it', () => {
    expect(
      feedWords(
        entry('project_updates', '3 projects were archived', 'Apollo, Hermes and Zeus.'),
        registry,
      ),
    ).toEqual({
      heading: '3 projects were archived',
      line: 'Apollo, Hermes and Zeus.',
      counted: true,
    })
    expect(categoryOf(entry('project_updates'), registry)?.label).toBe('Project updates')
  })

  it('names an entry with no heading by its registered category, which the app counts', () => {
    expect(feedWords(entry('project_updates', '  '), registry)).toEqual({
      heading: 'Project updates',
      line: '',
      counted: false,
    })
  })

  it('says nothing for a category the registry does not name, or before it loads', () => {
    expect(feedWords(entry('retired'), registry).heading).toBeNull()
    expect(feedWords(entry('security'), null).heading).toBeNull()
  })
})
