import { permissionsFrom, noPermissions, type Permissions } from '@b2b-template/core'
import type { ThemePreference } from '@b2b-template/theme'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/**
 * Who is signed in, and what they chose.
 *
 * The shell depends on this interface and nothing more: the web shell and
 * the mobile app render from the same provider, over the same source, so a
 * session means the same thing on both. No DOM here.
 */
export interface Preferences {
  theme: ThemePreference
  /** A BCP 47 tag, or null to follow the browser. */
  language: string | null
}

export interface SessionUser {
  id: string
  email: string
  displayName: string | null
  photoUrl?: string | null
  preferences: Preferences
}

/** The organization the session is active in, when one is. */
export interface SessionMembership {
  orgId: string
  membershipId: string
  role: string
}

export interface Session {
  user: SessionUser
  /** The effective permissions, as the server resolved them from roles. */
  permissions: readonly string[]
  /** Absent while the org chooser is pending, or for a development session. */
  membership?: SessionMembership
  /** The person has several organizations and none is active yet. */
  chooseOrganization?: boolean
}

export interface SessionSource {
  /** The current session, or null when nobody is signed in. */
  load(): Promise<Session | null>
  /** Saved on the server, so the choice follows the person to every device. */
  savePreferences(changes: Partial<Preferences>): Promise<void>
  signOut(): Promise<void>
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error'; retry: () => void }
  | { status: 'signed-in'; session: Session }

export interface SessionContextValue {
  state: SessionState
  /** Empty until someone is signed in. Hides; the API still refuses on its own. */
  permissions: Permissions
  savePreferences(changes: Partial<Preferences>): Promise<void>
  signOut(): Promise<void>
  /** Load the session again: after a sign-in, or when it changed elsewhere. */
  reload(): void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
  source,
  children,
}: {
  source: SessionSource
  children: ReactNode
}) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    const retry = () => {
      setState({ status: 'loading' })
      setAttempt((n) => n + 1)
    }
    source.load().then(
      (session) => {
        if (current) setState(session ? { status: 'signed-in', session } : { status: 'signed-out' })
      },
      () => {
        if (current) setState({ status: 'error', retry })
      },
    )
    return () => {
      current = false
    }
  }, [source, attempt])

  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  const savePreferences = useCallback(
    async (changes: Partial<Preferences>) => {
      const before = stateRef.current
      if (before.status !== 'signed-in') return
      const previous = before.session
      // Optimistic: the theme switches the moment it is chosen, not after a round trip.
      const preferences = { ...previous.user.preferences, ...changes }
      setState({
        status: 'signed-in',
        session: { ...previous, user: { ...previous.user, preferences } },
      })
      try {
        await source.savePreferences(changes)
      } catch (error) {
        setState({ status: 'signed-in', session: previous })
        throw error
      }
    },
    [source],
  )

  const signOut = useCallback(async () => {
    await source.signOut()
    setState({ status: 'signed-out' })
  }, [source])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const permissions = useMemo(
    () =>
      state.status === 'signed-in' ? permissionsFrom(state.session.permissions) : noPermissions,
    [state],
  )

  const value = useMemo(
    () => ({ state, permissions, savePreferences, signOut, reload }),
    [state, permissions, savePreferences, signOut, reload],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession is used outside SessionProvider')
  return value
}

/**
 * A session that lives in memory, for development and tests.
 *
 * Signed in from the start unless given null, and forgets everything on reload.
 * Replaced by the auth service's source once sign-in exists.
 */
export function memorySessionSource(
  initial: Session | null,
): SessionSource & { current(): Session | null } {
  let session = initial
  return {
    current: () => session,
    load: async () => session,
    async savePreferences(changes) {
      if (!session) throw new Error('Not signed in')
      session = {
        ...session,
        user: { ...session.user, preferences: { ...session.user.preferences, ...changes } },
      }
    },
    async signOut() {
      session = null
    },
  }
}
