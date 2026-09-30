import type { user } from '@b2b-template/api'

/**
 * The person's own profile: the rules web and the phone both
 * apply before the API applies them again.
 */

type WorkingHours = user.components['schemas']['WorkingHours']
export type Day = WorkingHours['days'][number]

/** The week in order: the keys the page translates. */
export const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** The directory attributes shown read-only, in order. */
export const DIRECTORY_FIELDS = [
  'job_title',
  'department',
  'division',
  'manager',
  'employee_type',
  'location',
  'country',
  'city',
] as const

/** The choices for appearance: the keys the page translates. */
export const THEMES = ['system', 'light', 'dark'] as const

/** The languages the product ships, as BCP 47 tags; empty follows the device. */
export const LANGUAGES = ['', 'en'] as const

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Working hours as the API takes them, or an error key. No days at all
 * clears them; otherwise both times must be HH:MM with the end after the start.
 */
export function workingHours(
  days: Day[],
  start: string,
  end: string,
): { value: WorkingHours | null } | { error: 'hoursInvalid' | 'hoursOrder' } {
  if (days.length === 0) return { value: null }
  if (!TIME.test(start) || !TIME.test(end)) return { error: 'hoursInvalid' }
  if (end <= start) return { error: 'hoursOrder' }
  return { value: { days: DAYS.filter((d) => days.includes(d)), start, end } }
}

/**
 * The zones this platform knows, so the choice is always a valid IANA name.
 * Only the device's own on a platform that cannot list them (Hermes), where
 * a typed name is checked instead.
 */
export function timeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  try {
    const all = intl.supportedValuesOf?.('timeZone')
    if (all && all.length > 0) return all
  } catch {
    // Listed below.
  }
  return [deviceTimeZone()]
}

/** The device's own zone, as an IANA name. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Zones matching what was typed, best first: a prefix of a city before a match anywhere. */
export function matchTimeZones(zones: readonly string[], query: string, limit = 20): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '_')
  if (!q) return zones.slice(0, limit)
  const scored: [number, string][] = []
  for (const zone of zones) {
    const lower = zone.toLowerCase()
    const city = lower.slice(lower.lastIndexOf('/') + 1)
    const score = city.startsWith(q) ? 0 : lower.startsWith(q) ? 1 : lower.includes(q) ? 2 : -1
    if (score >= 0) scored.push([score, zone])
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]))
    .slice(0, limit)
    .map(([, zone]) => zone)
}
