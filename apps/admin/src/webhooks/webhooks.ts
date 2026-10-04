import { isApiError, type webhooks } from '@b2b-template/api'

type Schemas = webhooks.components['schemas']
export type Endpoint = Schemas['Endpoint']
export type EventType = Schemas['EventType']
export type EventTypeList = Schemas['EventTypeList']
export type Delivery = Schemas['Delivery']
export type DeliveryDetail = Schemas['DeliveryDetail']
export type DeliveryStatus = Schemas['DeliveryStatus']
export type Attempt = Schemas['Attempt']

/** Every delivery status, in the order a filter offers them. */
export const DELIVERY_STATUSES: readonly DeliveryStatus[] = ['pending', 'succeeded', 'failed']

/** How long a rotated-out secret keeps signing unless asked: the service's own default. */
export const DEFAULT_OVERLAP_HOURS = 24
/** The longest overlap the service takes: seven days. */
export const MAX_OVERLAP_HOURS = 168

/** An endpoint's form as typed. */
export interface EndpointForm {
  url: string
  description: string
  /** The types it receives; none is every type, including ones registered later. */
  eventTypes: string[]
  enabled: boolean
}

export const EMPTY_ENDPOINT: EndpointForm = {
  url: '',
  description: '',
  eventTypes: [],
  enabled: true,
}

/** The form an existing endpoint starts its edit from. */
export function endpointForm(endpoint: Endpoint): EndpointForm {
  return {
    url: endpoint.url,
    description: endpoint.description,
    eventTypes: [...endpoint.event_types],
    enabled: endpoint.enabled,
  }
}

/** The fields a form or the service may find wrong, each shown beside its input. */
export type EndpointFields = Partial<Record<'url' | 'description' | 'event_types', string>>

/**
 * The body a form sends, or that the URL is missing. Whether the URL is
 * https on a public address, and whether each type is registered, is the
 * service's to say: its `fields` come back beside the inputs.
 */
export function endpointRequest(
  form: EndpointForm,
): { url: string; description: string; event_types: string[]; enabled: boolean } | null {
  const url = form.url.trim()
  if (!url) return null
  return {
    url,
    description: form.description.trim(),
    event_types: form.eventTypes,
    enabled: form.enabled,
  }
}

/** The overlap typed, as whole hours from 0 to 168, or null for anything else. */
export function overlapHours(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const hours = Number(text.trim())
  return hours <= MAX_OVERLAP_HOURS ? hours : null
}

/** What a refused write means for the page. */
export type Refusal =
  /** The plan has no webhooks: `plan.limit_reached`, naming the band that has them. */
  | { kind: 'plan'; requiredPlan?: string }
  /** The org has as many endpoints as it may (`webhooks.endpoint_limit`). */
  | { kind: 'limit' }
  /** Some fields are not valid; each message goes beside its input. */
  | { kind: 'fields'; fields: EndpointFields }
  /** Anything else, in the service's words when it gave some. */
  | { kind: 'other'; message?: string }

export function refusal(error: unknown): Refusal {
  if (!isApiError(error)) return { kind: 'other' }
  if (error.code === 'plan.limit_reached') {
    const required = error.fields?.required_plan
    return { kind: 'plan', ...(required ? { requiredPlan: required } : {}) }
  }
  if (error.code === 'webhooks.endpoint_limit') return { kind: 'limit' }
  const fields: EndpointFields = {}
  for (const key of ['url', 'description', 'event_types'] as const) {
    const message = error.fields?.[key]
    if (message) fields[key] = message
  }
  if (Object.keys(fields).length > 0) return { kind: 'fields', fields }
  return { kind: 'other', message: error.message }
}

/** How an attempt ended, in a few words: the status code, or the reason there was none. */
export function outcome(
  delivery: Pick<Delivery, 'last_status_code' | 'last_error'>,
): { code: number } | { error: string } | null {
  if (delivery.last_status_code !== undefined) return { code: delivery.last_status_code }
  if (delivery.last_error) return { error: delivery.last_error }
  return null
}
