/**
 * Live session events: what the backend pushes to an open app, such as a
 * session that has just ended.
 *
 * The identity service streams them at `GET /v1/session/events` as
 * Server-Sent Events, named by the session cookie: first `event: ready` with
 * `{"session_id": …}`, then one `event: <type>` per event with the event as
 * JSON. The stream ends after a `session.revoked` for this session, and a
 * session that is already over gets that event at once. The stream carries
 * the events of the org the session was in when it opened, so a switch of
 * org reopens it. It is not in the OpenAPI contracts: an event stream is not
 * a request and an answer.
 *
 * No DOM here beyond the EventSource the platform passes in. The web shell
 * passes the browser's; a platform without one does not open the stream.
 */

/** The core's event types. */
export const CORE_LIVE_EVENTS = ['session.revoked', 'membership.changed', 'org.suspended'] as const
export type CoreLiveEventType = (typeof CORE_LIVE_EVENTS)[number]

/**
 * Every event type an app listens for, to the shape of its `data`. A
 * product registers its own by augmenting this interface, next to the code
 * that listens:
 *
 * ```ts
 * declare module '@b2b-template/client' {
 *   interface LiveEventTypes {
 *     'project.shared': { project_id: string }
 *   }
 * }
 * ```
 *
 * The backend registers the same type in the service that publishes it.
 */
export interface LiveEventTypes {
  'session.revoked': undefined
  'membership.changed': undefined
  'org.suspended': undefined
}

export type LiveEventType = keyof LiveEventTypes & string

/** One event, as the stream carries it. Ids only: the bus holds no personal data. */
export interface LiveEvent<T extends LiveEventType = LiveEventType> {
  type: T
  org_id?: string
  user_id?: string
  session_id?: string
  membership_id?: string
  /** How far a `session.revoked` reaches: this session, or all the person's. */
  scope?: 'session' | 'user'
  /** A stable reason, for the words. */
  code?: string
  /** A sentence, for anything that has no words of its own for `code`. */
  message?: string
  /** A product event's own payload. */
  data?: LiveEventTypes[T]
  /** When it happened, RFC 3339. */
  at: string
}

/** The part of the browser's EventSource the stream uses. */
export interface EventSourceLike {
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void
  close(): void
}

export type EventSourceFactory = new (
  url: string,
  init?: { withCredentials?: boolean },
) => EventSourceLike

export interface LiveSessionOptions {
  /** The stream's address: the identity service's `/v1/session/events`. */
  url: string
  /** The platform's EventSource: the browser's on web. */
  EventSource: EventSourceFactory
  /**
   * This session ended on the server: the app forgets it and goes to
   * sign-in. The stream is closed and does not reopen.
   */
  onRevoked?: (event: LiveEvent<'session.revoked'>) => void
  /** The stream is open and names its session. */
  onReady?: (sessionId: string) => void
  /** The first wait before reopening a stream that failed, doubled on each failure. */
  initialDelayMs?: number
  /** The longest wait between attempts. */
  maxDelayMs?: number
  /** For tests: the timer and the jitter. */
  setTimeout?: (run: () => void, ms: number) => unknown
  clearTimeout?: (timer: unknown) => void
  random?: () => number
}

export type LiveHandler<T extends LiveEventType> = (event: LiveEvent<T>) => void

export interface LiveSession {
  /** Listen for one type of event. Returns the way to stop. */
  on<T extends LiveEventType>(type: T, handler: LiveHandler<T>): () => void
  /** Stop for good: the page is closing, or the person signed out here. */
  close(): void
  /** The session id the server named in `ready`, once it has. */
  sessionId(): string | null
}

/** The wait before attempt n (0-based) to reopen: doubling, capped, with jitter. */
export function backoffDelay(
  attempt: number,
  initialMs: number,
  maxMs: number,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(maxMs, initialMs * 2 ** attempt)
  // Between half and all of it, so tabs that lost the server together do
  // not all come back at the same moment.
  return Math.round(ceiling / 2 + (random() * ceiling) / 2)
}

/**
 * Open the stream and keep it open.
 *
 * A stream that fails is closed and opened again after a wait that doubles
 * up to `maxDelayMs`; a `ready` resets it. The browser's own reconnect is not
 * used: it retries forever at a fixed pace, and never after an HTTP refusal.
 * An event naming another session is not this one's and is dropped. A
 * `session.revoked` for this session, or for the person, closes the stream
 * for good and calls `onRevoked`.
 */
export function openLiveSession(options: LiveSessionOptions): LiveSession {
  const initial = options.initialDelayMs ?? 1_000
  const max = options.maxDelayMs ?? 30_000
  const later = options.setTimeout ?? ((run, ms) => globalThis.setTimeout(run, ms))
  const cancel =
    options.clearTimeout ??
    ((timer) => globalThis.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>))
  const random = options.random ?? Math.random

  const handlers = new Map<string, Set<(event: LiveEvent) => void>>()
  let source: EventSourceLike | null = null
  let timer: unknown = null
  let attempt = 0
  let session: string | null = null
  let stopped = false

  const parse = (raw: unknown): LiveEvent | null => {
    if (typeof raw !== 'string') return null
    try {
      const value = JSON.parse(raw) as unknown
      return value && typeof value === 'object' && typeof (value as LiveEvent).type === 'string'
        ? (value as LiveEvent)
        : null
    } catch {
      return null
    }
  }

  const deliver = (event: LiveEvent) => {
    // The server filters too; this is the client not trusting a stray one.
    if (event.session_id && session && event.session_id !== session) return
    if (event.type === 'session.revoked') {
      stop()
      options.onRevoked?.(event as LiveEvent<'session.revoked'>)
    }
    for (const handler of [...(handlers.get(event.type) ?? [])]) handler(event)
  }

  const listen = (target: EventSourceLike, type: string) => {
    target.addEventListener(type, (message) => {
      if (target !== source) return
      const event = parse(message.data)
      if (event && event.type === type) deliver(event)
    })
  }

  const open = () => {
    timer = null
    if (stopped) return
    const target = new options.EventSource(options.url, { withCredentials: true })
    source = target
    target.addEventListener('ready', (message) => {
      if (target !== source) return
      try {
        const body = JSON.parse(String(message.data)) as { session_id?: unknown }
        if (typeof body.session_id === 'string') session = body.session_id
      } catch {
        // A ready without a body is still ready.
      }
      attempt = 0
      if (session) options.onReady?.(session)
    })
    target.addEventListener('error', () => {
      if (target !== source) return
      target.close()
      source = null
      if (stopped) return
      timer = later(open, backoffDelay(attempt, initial, max, random))
      attempt += 1
    })
    for (const type of new Set<string>([...CORE_LIVE_EVENTS, ...handlers.keys()])) {
      listen(target, type)
    }
  }

  const stop = () => {
    stopped = true
    if (timer !== null) cancel(timer)
    timer = null
    source?.close()
    source = null
  }

  open()

  return {
    on(type, handler) {
      let set = handlers.get(type)
      if (!set) {
        set = new Set()
        handlers.set(type, set)
        // A type the open stream was not told about: listen from now on.
        if (source && !(CORE_LIVE_EVENTS as readonly string[]).includes(type)) {
          listen(source, type)
        }
      }
      const entry = handler as unknown as (event: LiveEvent) => void
      set.add(entry)
      return () => {
        set.delete(entry)
      }
    },
    close: stop,
    sessionId: () => session,
  }
}
