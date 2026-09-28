import { memorySessionSource, type SessionSource } from './session'

/**
 * The session the apps use until sign-in exists.
 *
 * In a development build it signs in a developer holding the permissions given,
 * so an app lists what its pages need to open them all. In a production build nobody is signed
 * in, so a production build of the shell shows the sign-in page rather than
 * letting anyone in as a developer.
 */
export function developmentSessionSource(
  isDevelopment: boolean,
  permissions: readonly string[],
): SessionSource {
  if (!isDevelopment) return memorySessionSource(null)
  return memorySessionSource({
    user: {
      id: 'developer',
      email: 'developer@example.org',
      displayName: null,
      preferences: { theme: 'system', language: null },
    },
    permissions,
  })
}
