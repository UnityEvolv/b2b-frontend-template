import type { user } from '@b2b-template/api'

type ImportRow = user.components['schemas']['ImportRow']

/** The fields a sheet's columns map to: the keys the page translates. */
export const IMPORT_FIELDS = ['email', 'name', 'role'] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]
export type Mapping = Record<ImportField, string>

/** The fields a sheet must provide; role defaults to User when unmapped. */
export const REQUIRED_FIELDS: ImportField[] = ['email', 'name']

/** Headers people commonly use for each field, in lower case without punctuation. */
const SYNONYMS: Record<ImportField, string[]> = {
  email: ['email', 'emailaddress', 'mail', 'workemail', 'userprincipalname', 'upn', 'login'],
  name: ['name', 'fullname', 'displayname', 'employeename', 'person', 'username'],
  role: ['role', 'orgrole', 'access', 'permission', 'accesslevel'],
}

const squash = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * A first guess at the mapping from the sheet's own headers: an exact
 * synonym first, then a header that contains one. Each column is used once,
 * and a field with no likely column is left empty for the admin to choose.
 */
export function guessMapping(columns: string[]): Mapping {
  const out: Mapping = { email: '', name: '', role: '' }
  const used = new Set<string>()
  for (const pass of ['exact', 'contains'] as const) {
    for (const field of IMPORT_FIELDS) {
      if (out[field]) continue
      const hit = columns.find((c) => {
        if (used.has(c)) return false
        const s = squash(c)
        return SYNONYMS[field].some((w) => (pass === 'exact' ? s === w : s.includes(w)))
      })
      if (hit) {
        out[field] = hit
        used.add(hit)
      }
    }
  }
  return out
}

/** The mapping as the import endpoint takes it: only the fields chosen. */
export function mappingJson(mapping: Mapping): string {
  const chosen = Object.fromEntries(Object.entries(mapping).filter(([, column]) => column))
  return JSON.stringify(chosen)
}

const cell = (value: string | number | undefined) => {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** The rows that failed, as a CSV an admin can fix and upload again. */
export function errorReport(rows: ImportRow[], header: string[]): string {
  const lines = [header.map(cell).join(',')]
  for (const r of rows) {
    if (r.status !== 'failed') continue
    const problems = r.errors.map((e) => e.message).join('; ')
    lines.push([r.row, r.email, r.name, r.role, problems].map(cell).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

/** Whether a file looks like a sheet the import takes, by name. */
export function isSheet(file: File): boolean {
  return /\.(csv|xlsx)$/i.test(file.name)
}
