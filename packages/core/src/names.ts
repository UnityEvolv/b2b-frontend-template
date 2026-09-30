/**
 * How a person is named on screen.
 *
 * A name is whatever the person typed, in whatever script. Nothing here splits
 * it into given and family names or reorders it: that guesses wrong for most of
 * the world. The fallback when there is no name is the part of the email before
 * the `@`, because it is what the person chose and it is never empty.
 */
export interface Named {
  displayName?: string | null
  email: string
}

export function displayName(person: Named): string {
  const name = person.displayName?.trim()
  if (name) return name
  const local = person.email.split('@')[0]?.trim()
  return local || person.email
}

/**
 * Up to two letters for an avatar with no photo.
 *
 * Taken by grapheme, not by UTF-16 unit, so a name that starts with an accented
 * letter or a character outside the basic plane is not cut in half.
 */
export function initials(person: Named): string {
  const words = displayName(person).split(/\s+/).filter(Boolean)
  const first = (word: string | undefined) => (word ? (Array.from(word)[0] ?? '') : '')
  const letters =
    words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : first(words[0])
  return letters.toLocaleUpperCase()
}

/**
 * A key from a contract as a label, when the strings have none for it: a
 * category the server added since, say. `admin_billing` reads "Admin billing".
 * A fallback, never the first choice; the strings win whenever they have one.
 */
export function humanizeKey(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
