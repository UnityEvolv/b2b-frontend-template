/**
 * @b2b-template/core
 *
 * Shared by the three web apps and the React Native app. Domain types arrive
 * from the generated API client; this holds the behaviour around them that every
 * app must agree on.
 */
export { noPermissions, permissionsFrom, type Permissions } from './permissions'
export { displayName, humanizeKey, initials, type Named } from './names'
export {
  formatDate,
  formatDateTime,
  formatRelative,
  formatTime,
  isValidTimeZone,
  timeZoneLabel,
  type DateInput,
  type Locale,
} from './dates'
