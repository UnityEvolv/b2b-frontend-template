/**
 * What the signed-in person may do, as the UI asks it.
 *
 * The server sends the effective permissions with the session; roles are
 * resolved there, not here, so the UI never re-derives a rule the server owns.
 * This only answers "is it in the set", the same way in every app, so a button
 * is hidden in admin exactly when it is hidden on mobile.
 *
 * Hiding is a courtesy. The API refuses the action independently, and nothing
 * here is a security boundary.
 */
export interface Permissions<P extends string = string> {
  can(permission: P): boolean
  canAll(...permissions: P[]): boolean
  canAny(...permissions: P[]): boolean
}

export function permissionsFrom<P extends string>(granted: Iterable<P>): Permissions<P> {
  const set = new Set(granted)
  return {
    can: (permission) => set.has(permission),
    canAll: (...permissions) => permissions.every((permission) => set.has(permission)),
    canAny: (...permissions) => permissions.some((permission) => set.has(permission)),
  }
}

/** Nobody signed in, or a session still loading: nothing is allowed. */
export const noPermissions: Permissions<never> = permissionsFrom<never>([])
