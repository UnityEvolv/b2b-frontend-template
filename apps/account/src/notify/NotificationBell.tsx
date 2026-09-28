import { Badge, Button, Icon, Popover, Spinner, type IconName } from '@unityevolv/unitykit'
import { desktopBridge, useOrg } from '@b2b-template/ui-web'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { desktopNotices, entryPath, useFeed, type Category, type Entry } from './feed'

/** An icon per category the feed knows; anything else shows the bell. */
const ICONS: Partial<Record<Category, IconName>> = {
  mention: 'message',
  direct_message: 'message',
  admin_billing: 'settings',
  admin_directory: 'users',
}

const text = (data: Record<string, unknown>, key: string): string =>
  typeof data[key] === 'string' ? (data[key] as string) : ''

/**
 * The bell: what happened while the person was not looking, newest first and
 * grouped by day, a batch as one line that opens to its items. Opening an
 * entry goes where it points and reads it, on every device.
 */
export function NotificationBell() {
  const { t, i18n } = useTranslation('account')
  const org = useOrg()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [mentionsOnly, setMentionsOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const feed = useFeed(org?.api, org?.orgId, mentionsOnly ? 'mention' : null)

  // A new unread entry is announced without taking focus.
  const [announce, setAnnounce] = useState('')
  const previous = useRef(feed.unread)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (feed.unread > previous.current) setAnnounce(t('notify.arrived', { count: feed.unread }))
      previous.current = feed.unread
    }, 0)
    return () => clearTimeout(timer)
  }, [feed.unread, t])

  const summary = useCallback(
    (e: Entry): string => {
      const by = text(e.data, 'by') || t('notify.someone')
      switch (e.kind) {
        case 'mention':
          return t('notify.kinds.mention', { count: e.count, by })
        case 'direct_message':
          return t('notify.kinds.direct', { count: e.count, by })
        case 'test':
          return t('notify.kinds.test')
        default:
          return text(e.data, 'heading') || t('notify.kinds.other')
      }
    },
    [t],
  )

  // In the desktop app a new entry is a system notification too, when the
  // window is not in front. Only entries new since the page opened; the
  // first load is what was already there.
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!feed.entries) return
    const known = seen.current
    seen.current = new Set([...(known ?? []), ...feed.entries.map((e) => e.id)])
    const bridge = desktopBridge()
    if (!known || !bridge?.notify) return
    for (const notice of desktopNotices(feed.entries, known, summary, t('notify.desktopBody')))
      bridge.notify(notice)
  }, [feed.entries, summary, t])

  if (!org) return null

  const day = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const time = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' })
  const groups: { day: string; entries: Entry[] }[] = []
  for (const e of feed.entries ?? []) {
    const d = day.format(new Date(e.occurred_at))
    const last = groups[groups.length - 1]
    if (last && last.day === d) last.entries.push(e)
    else groups.push({ day: d, entries: [e] })
  }

  const go = (e: Entry) => {
    if (!e.read) void feed.read({ ids: [e.id] })
    setOpen(false)
    void navigate(entryPath(e.link))
  }

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="end"
        width="lg"
        className="max-h-[70vh] overflow-y-auto"
        trigger={
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('notify.bell', { count: feed.unread })}
            className="relative"
          >
            <Icon name="bell" size="sm" />
            {feed.unread > 0 && (
              <Badge variant="danger">{feed.unread > 99 ? '99+' : feed.unread}</Badge>
            )}
          </Button>
        }
      >
        <div role="dialog" aria-label={t('notify.title')}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t('notify.title')}</h2>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={mentionsOnly ? 'secondary' : 'ghost'}
                aria-pressed={mentionsOnly}
                onClick={() => setMentionsOnly(!mentionsOnly)}
              >
                {t('notify.mentionsOnly')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={feed.unread === 0}
                onClick={() => void feed.read({ all: true })}
              >
                {t('notify.readAll')}
              </Button>
            </div>
          </div>
          {feed.entries === null && <Spinner block size="sm" label={t('notify.loading')} />}
          {feed.entries?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('notify.empty')}</p>
          )}
          {groups.map((g) => (
            <section key={g.day} aria-label={g.day}>
              <h3 className="mt-2 text-xs font-semibold uppercase text-muted-foreground">
                {g.day}
              </h3>
              <ul>
                {g.entries.map((e) => (
                  <li key={e.id} className="border-b border-border last:border-0">
                    <div className="flex items-start gap-2 py-2">
                      <Icon name={ICONS[e.category] ?? 'bell'} size="sm" />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => go(e)}
                      >
                        <span
                          className={['block text-sm', e.read ? '' : 'font-semibold'].join(' ')}
                        >
                          {summary(e)}
                        </span>
                        <time className="text-xs text-muted-foreground" dateTime={e.occurred_at}>
                          {time.format(new Date(e.occurred_at))}
                        </time>
                      </button>
                      {e.count > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-expanded={expanded === e.id}
                          aria-label={t('notify.expand', { count: e.count })}
                          onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                        >
                          <Icon
                            name={expanded === e.id ? 'chevron-up' : 'chevron-down'}
                            size="sm"
                          />
                        </Button>
                      )}
                      {!e.read && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label={t('notify.unread')}
                        />
                      )}
                    </div>
                    {expanded === e.id && (
                      <ul className="mb-2 ml-6 space-y-1">
                        {e.items.map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            {summary({
                              ...e,
                              count: 1,
                              kind: String(item.kind ?? e.kind),
                              data: (item.data as Record<string, unknown>) ?? e.data,
                            })}
                            {typeof item.at === 'string' && ` · ${time.format(new Date(item.at))}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {feed.more && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => void feed.more?.()}
            >
              {t('notify.more')}
            </Button>
          )}
          <div className="mt-2 border-t border-border pt-2 text-right">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false)
                void navigate('/settings/notifications')
              }}
            >
              {t('notify.settings')}
            </Button>
          </div>
        </div>
      </Popover>
    </>
  )
}
