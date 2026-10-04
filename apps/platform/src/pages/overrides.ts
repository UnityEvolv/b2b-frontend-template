import type { organization } from '@b2b-template/api'
import { humanizeKey } from '@b2b-template/core'

type Schemas = organization.components['schemas']
export type PlanOverride = Schemas['PlanOverride']
export type PlanOverrideInput = Schemas['PlanOverrideInput']
export type OverrideKind = PlanOverride['kind']

/** What an override can be set on: a registered limit or feature, as the catalogue names it. */
export interface OverrideTarget {
  /** `limit:<key>` or `feature:<key>`, a picker's value. */
  value: string
  kind: OverrideKind
  key: string
  label: string
}

/**
 * Every limit and feature the deployment registers, limits first, in the
 * catalogue's order: the only things an override can be set on. Nothing is
 * typed; the organization service refuses a key it does not know too.
 */
export function overrideTargets(
  catalogue: Pick<Schemas['PlanCatalogue'], 'limits' | 'features'> | null,
): OverrideTarget[] {
  const of = (kind: OverrideKind, items: { key: string; label: string }[]) =>
    items.map((item) => ({
      value: `${kind}:${item.key}`,
      kind,
      key: item.key,
      label: item.label || humanizeKey(item.key).toLowerCase(),
    }))
  return [...of('limit', catalogue?.limits ?? []), ...of('feature', catalogue?.features ?? [])]
}

/** The override form as typed: every field a string, as the inputs hold it. */
export interface OverrideForm {
  target: string
  /** A limit's cap; ignored with `noCap`. */
  cap: string
  noCap: boolean
  /** A feature's grant: `true` grants it, `false` takes it away. */
  allowed: 'true' | 'false'
  /** The last day it applies, `yyyy-mm-dd`, or empty for no end. */
  endsOn: string
}

export const EMPTY_FORM: OverrideForm = {
  target: '',
  cap: '',
  noCap: false,
  allowed: 'true',
  endsOn: '',
}

/** Which field is wrong, as the form's error keys name them. */
export type OverrideFormError = 'target' | 'cap' | 'endsOn'

/** The day as a date input holds it, in the viewer's time zone. */
export function toDateInput(at: string | Date): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The end of the day a date input names, in the viewer's time zone: the override applies all that day. */
export function endOfDay(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const at = new Date(`${day}T23:59:59`)
  return Number.isNaN(at.getTime()) ? null : at
}

/**
 * The request the form makes, or the first field that is wrong: a target
 * from the catalogue, a whole cap of 0 or more (or no cap, which is 0), and
 * an end, when given, that is still ahead. The service checks the same.
 */
export function overrideRequest(
  form: OverrideForm,
  targets: readonly OverrideTarget[],
  now: Date,
): { kind: OverrideKind; key: string; body: PlanOverrideInput } | { error: OverrideFormError } {
  const target = targets.find((t) => t.value === form.target)
  if (!target) return { error: 'target' }
  let ends: Date | null = null
  if (form.endsOn) {
    ends = endOfDay(form.endsOn)
    if (!ends || ends.getTime() <= now.getTime()) return { error: 'endsOn' }
  }
  const end = ends ? { ends_at: ends.toISOString() } : {}
  if (target.kind === 'feature') {
    return { kind: 'feature', key: target.key, body: { allowed: form.allowed === 'true', ...end } }
  }
  let cap = 0
  if (!form.noCap) {
    const text = form.cap.trim()
    if (!/^\d+$/.test(text)) return { error: 'cap' }
    cap = Number(text)
    // 0 is no cap; "no cap" says so in words.
    if (!Number.isSafeInteger(cap) || cap < 1) return { error: 'cap' }
  }
  return { kind: 'limit', key: target.key, body: { cap, ...end } }
}

/** The form filled from an override, to edit it. */
export function formFrom(override: PlanOverride): OverrideForm {
  return {
    target: `${override.kind}:${override.key}`,
    cap: override.kind === 'limit' && override.cap ? String(override.cap) : '',
    noCap: override.kind === 'limit' && !override.cap,
    allowed: override.allowed === false ? 'false' : 'true',
    endsOn: override.ends_at ? toDateInput(override.ends_at) : '',
  }
}
