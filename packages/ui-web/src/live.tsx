import {
  openLiveSession,
  type EventSourceFactory,
  type LiveEvent,
  type LiveEventType,
  type LiveHandler,
  type LiveSession,
} from '@b2b-template/client'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useApp } from './app'
import { useSession } from './session'

/**
 * Live session events in every signed-in web app.
 *
 * The shell keeps the identity service's event stream open while someone is
 * signed in, and answers the core's events itself: `session.revoked` forgets
 * the session and lands on sign-in with a neutral notice, and
 * `membership.changed` or `org.suspended` load the session again, which may
 * move the person to another org or sign them out. The stream carries the
 * events of the org the session was in when it opened, so it reopens when
 * the org changes. A page, the header or an app's shell listens for its own
 * product's events with `useLiveEvent`.
 */

type Emit = (event: LiveEvent) => void

/** The app's listeners, kept across reopening the stream. */
interface LiveHub {
  on<T extends LiveEventType>(type: T, handler: LiveHandler<T>): () => void
  /** Hand every type anyone listens for, now or later, to this stream. */
  attach(session: LiveSession): () => void
}

function createHub(): LiveHub {
  const handlers = new Map<string, Set<Emit>>()
  let current: { session: LiveSession; offs: Map<string, () => void> } | null = null
  const emit = (event: LiveEvent) => {
    for (const handler of [...(handlers.get(event.type) ?? [])]) handler(event)
  }
  const forward = (type: string) => {
    if (current && !current.offs.has(type)) {
      current.offs.set(type, current.session.on(type as LiveEventType, emit))
    }
  }
  return {
    on(type, handler) {
      let set = handlers.get(type)
      if (!set) handlers.set(type, (set = new Set()))
      const entry = handler as unknown as Emit
      set.add(entry)
      forward(type)
      return () => {
        set.delete(entry)
      }
    },
    attach(session) {
      const attached = { session, offs: new Map<string, () => void>() }
      current = attached
      for (const type of handlers.keys()) forward(type)
      return () => {
        for (const off of attached.offs.values()) off()
        if (current === attached) current = null
      }
    },
  }
}

const LiveContext = createContext<LiveHub | null>(null)

/** The browser's EventSource, where there is one. */
const browserEventSource = (): EventSourceFactory | undefined =>
  (globalThis as { EventSource?: EventSourceFactory }).EventSource

/** Keeps the stream open for the signed-in session. Rendered by the layout. */
export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useApp()
  const { state, ended, reload } = useSession()
  const [hub] = useState(createHub)
  const signedIn = state.status === 'signed-in'
  // Reopened when the org changes: the stream is the org it opened in.
  const orgId = signedIn ? (state.session.membership?.orgId ?? '') : null
  const url = auth?.eventsUrl

  const answers = useRef({ ended, reload })
  useLayoutEffect(() => {
    answers.current = { ended, reload }
  }, [ended, reload])

  useEffect(() => {
    const EventSource = browserEventSource()
    if (!url || orgId === null || !EventSource) return
    const session = openLiveSession({
      url,
      EventSource,
      onRevoked: () => void answers.current.ended(),
    })
    const refresh = () => answers.current.reload()
    const offs = [
      session.on('membership.changed', refresh),
      session.on('org.suspended', refresh),
      hub.attach(session),
    ]
    return () => {
      for (const off of offs) off()
      session.close()
    }
  }, [hub, url, orgId])

  return <LiveContext.Provider value={hub}>{children}</LiveContext.Provider>
}

/**
 * Listen for one type of live event while the component is mounted. A
 * product's own type is declared on `LiveEventTypes` (see
 * `@b2b-template/client`), which types `event.data`:
 *
 * ```ts
 * useLiveEvent('project.shared', (event) => refetch(event.data?.project_id))
 * ```
 *
 * Nothing happens outside a signed-in page, or without a stream.
 */
export function useLiveEvent<T extends LiveEventType>(type: T, handler: LiveHandler<T>): void {
  const hub = useContext(LiveContext)
  const latest = useRef(handler)
  useLayoutEffect(() => {
    latest.current = handler
  }, [handler])
  useEffect(() => hub?.on(type, (event) => latest.current(event)), [hub, type])
}
