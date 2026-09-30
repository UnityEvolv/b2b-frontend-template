import { describe, expect, it, vi } from 'vitest'

import { backoffDelay, openLiveSession, type EventSourceLike, type LiveEvent } from './live'

// A product's own event type, registered the way a product does it.
declare module './live' {
  interface LiveEventTypes {
    'example.pinged': { item_id: string }
  }
}

type Listener = (event: { data?: unknown }) => void

/** The browser's EventSource, in memory: a test says what the server sends. */
class FakeEventSource implements EventSourceLike {
  static opened: FakeEventSource[] = []
  listeners = new Map<string, Listener[]>()
  closed = false
  constructor(
    public url: string,
    public init?: { withCredentials?: boolean },
  ) {
    FakeEventSource.opened.push(this)
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  close() {
    this.closed = true
  }
  send(type: string, body?: unknown) {
    const data = body === undefined ? undefined : JSON.stringify(body)
    for (const listener of this.listeners.get(type) ?? []) listener({ data })
  }
  fail() {
    this.send('error')
  }
}

const event = (type: string, fields: Partial<LiveEvent> = {}) => ({
  type,
  at: '2026-10-01T00:00:00Z',
  ...fields,
})

function open(options: { onRevoked?: (event: LiveEvent<'session.revoked'>) => void } = {}) {
  FakeEventSource.opened = []
  const timers: { run: () => void; ms: number }[] = []
  const session = openLiveSession({
    url: 'https://api.example.test/identity/v1/session/events',
    EventSource: FakeEventSource,
    setTimeout: (run, ms) => {
      const timer = { run, ms }
      timers.push(timer)
      return timer
    },
    clearTimeout: (timer) => {
      const i = timers.indexOf(timer as (typeof timers)[number])
      if (i >= 0) timers.splice(i, 1)
    },
    // The longest wait each time, so the backoff is exact.
    random: () => 1,
    ...options,
  })
  const latest = () => FakeEventSource.opened[FakeEventSource.opened.length - 1]!
  /** Let the pending reconnect happen. */
  const tick = () => timers.shift()!.run()
  return { session, latest, timers, tick }
}

describe('openLiveSession', () => {
  it('opens the stream with the session cookie and learns its session', () => {
    const onReady = vi.fn()
    FakeEventSource.opened = []
    const session = openLiveSession({ url: '/events', EventSource: FakeEventSource, onReady })
    const source = FakeEventSource.opened[0]!
    expect(source.url).toBe('/events')
    expect(source.init).toEqual({ withCredentials: true })
    source.send('ready', { session_id: 's-1' })
    expect(session.sessionId()).toBe('s-1')
    expect(onReady).toHaveBeenCalledWith('s-1')
    session.close()
    expect(source.closed).toBe(true)
  })

  it('stops for good on a revocation of its own session', () => {
    const onRevoked = vi.fn()
    const { latest, timers } = open({ onRevoked })
    latest().send('ready', { session_id: 's-1' })
    latest().send(
      'session.revoked',
      event('session.revoked', { session_id: 's-1', code: 'revoked' }),
    )
    expect(onRevoked).toHaveBeenCalledWith(expect.objectContaining({ code: 'revoked' }))
    expect(latest().closed).toBe(true)
    // The server ends the stream after it; nothing reopens.
    latest().fail()
    expect(timers).toHaveLength(0)
    expect(FakeEventSource.opened).toHaveLength(1)
  })

  it('treats a revocation of every session of the person as its own', () => {
    const onRevoked = vi.fn()
    const { latest } = open({ onRevoked })
    latest().send('ready', { session_id: 's-1' })
    latest().send('session.revoked', event('session.revoked', { user_id: 'u-1', scope: 'user' }))
    expect(onRevoked).toHaveBeenCalledTimes(1)
  })

  it('is told at once when the session was already over', () => {
    const onRevoked = vi.fn()
    const { latest } = open({ onRevoked })
    // No ready: a dead cookie gets the revocation straight away.
    latest().send('session.revoked', event('session.revoked', { code: 'signed_out' }))
    expect(onRevoked).toHaveBeenCalledTimes(1)
  })

  it("ignores another session's events", () => {
    const onRevoked = vi.fn()
    const changed = vi.fn()
    const { session, latest } = open({ onRevoked })
    session.on('membership.changed', changed)
    latest().send('ready', { session_id: 's-1' })
    latest().send('session.revoked', event('session.revoked', { session_id: 's-2' }))
    latest().send('membership.changed', event('membership.changed', { session_id: 's-2' }))
    expect(onRevoked).not.toHaveBeenCalled()
    expect(changed).not.toHaveBeenCalled()
    expect(latest().closed).toBe(false)
    latest().send('membership.changed', event('membership.changed', { org_id: 'o-1' }))
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('drops what it cannot read', () => {
    const changed = vi.fn()
    const { session, latest } = open()
    session.on('membership.changed', changed)
    for (const listener of latest().listeners.get('membership.changed')!) {
      listener({ data: 'not json' })
      listener({ data: JSON.stringify({ type: 'org.suspended' }) })
    }
    expect(changed).not.toHaveBeenCalled()
  })

  it('reopens a failed stream with a doubling wait, capped, and resets once ready', () => {
    const { latest, timers, tick } = open()
    const waits: number[] = []
    for (let i = 0; i < 7; i++) {
      latest().fail()
      expect(latest().closed).toBe(true)
      waits.push(timers[0]!.ms)
      tick()
    }
    expect(waits).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000])
    expect(FakeEventSource.opened).toHaveLength(8)
    latest().send('ready', { session_id: 's-1' })
    latest().fail()
    expect(timers[0]!.ms).toBe(1_000)
  })

  it('does not reopen once closed, and cancels a pending reopen', () => {
    const { session, latest, timers } = open()
    latest().fail()
    expect(timers).toHaveLength(1)
    session.close()
    expect(timers).toHaveLength(0)
  })

  it("delivers a product's own events, typed, to whoever listens, across a reopen", () => {
    const { session, latest, tick } = open()
    const pinged: string[] = []
    const off = session.on('example.pinged', (e) => pinged.push(e.data?.item_id ?? ''))
    latest().send('example.pinged', event('example.pinged', { data: { item_id: 'i-1' } }))
    latest().fail()
    tick()
    latest().send('example.pinged', event('example.pinged', { data: { item_id: 'i-2' } }))
    off()
    latest().send('example.pinged', event('example.pinged', { data: { item_id: 'i-3' } }))
    expect(pinged).toEqual(['i-1', 'i-2'])
  })
})

describe('backoffDelay', () => {
  it('waits between half and all of the doubled wait, never past the cap', () => {
    expect(backoffDelay(0, 1_000, 30_000, () => 0)).toBe(500)
    expect(backoffDelay(0, 1_000, 30_000, () => 1)).toBe(1_000)
    expect(backoffDelay(3, 1_000, 30_000, () => 0.5)).toBe(6_000)
    expect(backoffDelay(20, 1_000, 30_000, () => 1)).toBe(30_000)
  })
})
