/**
 * Dates and times, always in a named zone and locale.
 *
 * A distributed team is the product, so "3 pm" is never enough: it is 3 pm for
 * somebody. Every function takes the locale and the zone explicitly rather than
 * reading them from the device, so the same call gives the same answer in a
 * test, in a browser and on a phone, and a person's saved zone wins over
 * wherever their laptop happens to be.
 *
 * Built on `Intl`, which web and Hermes both provide, so there is no date
 * library to download.
 */
export interface Locale {
  /** BCP 47, from the translation layer. */
  locale: string
  /** IANA, from the person's profile. */
  timeZone: string
}

export type DateInput = Date | string | number

const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value))

export function formatDate(value: DateInput, { locale, timeZone }: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(toDate(value))
}

export function formatTime(value: DateInput, { locale, timeZone }: Locale): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(toDate(value))
}

export function formatDateTime(value: DateInput, { locale, timeZone }: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(toDate(value))
}

/** Whether a zone name is one this runtime knows. Profiles are validated with it. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * The zone's short name at a moment, such as "GMT+5:30" or "PST".
 *
 * At a moment, because the same zone has a different offset in summer.
 */
export function timeZoneLabel(value: DateInput, { locale, timeZone }: Locale): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(
    toDate(value),
  )
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.345],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
]

/** "5 minutes ago", "in 2 days". `now` is passed in, so the result is testable. */
export function formatRelative(
  value: DateInput,
  now: DateInput,
  { locale }: Pick<Locale, 'locale'>,
): string {
  let amount = (toDate(value).getTime() - toDate(now).getTime()) / 1000
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(amount) < size) return format.format(Math.round(amount), unit)
    amount /= size
  }
  return format.format(Math.round(amount), 'year')
}
