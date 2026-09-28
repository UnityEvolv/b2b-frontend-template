import type { organization } from '@b2b-template/api'

type Schemas = organization.components['schemas']
export type Plan = Schemas['Plan']
export type OrgStatus = Schemas['OrganizationStatus']

/** Every plan band, lowest first: the keys the pages translate. */
export const PLANS: Plan[] = ['free', 'team-50', 'team-200', 'team-500', 'enterprise']

/** Both organization statuses: the keys the pages translate. */
export const STATUSES: OrgStatus[] = ['active', 'suspended']

/** The page sizes the list offers. */
export const PAGE_SIZES = [25, 50, 100, 200] as const

/** What the organizations list shows, as its URL says it. */
export interface ListView {
  q: string
  plan: Plan | ''
  status: OrgStatus | ''
  sort: 'created_at' | 'name'
  order: 'asc' | 'desc'
  limit: number
  /** The cursors of the pages stepped through; the last is this page's. */
  pages: string[]
}

const DEFAULT_LIMIT = 50

/** Newest first by created date, A to Z by name, unless the URL says otherwise. */
function defaultOrder(sort: ListView['sort']): ListView['order'] {
  return sort === 'name' ? 'asc' : 'desc'
}

/** The view a URL describes; anything unknown falls back to the default. */
export function readView(params: URLSearchParams): ListView {
  const sort = params.get('sort') === 'name' ? 'name' : 'created_at'
  const order = params.get('order')
  const plan = params.get('plan') as Plan | null
  const status = params.get('status') as OrgStatus | null
  const limit = Number(params.get('limit'))
  return {
    q: params.get('q') ?? '',
    plan: plan && PLANS.includes(plan) ? plan : '',
    status: status && STATUSES.includes(status) ? status : '',
    sort,
    order: order === 'asc' || order === 'desc' ? order : defaultOrder(sort),
    limit: (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_LIMIT,
    pages: (params.get('pages') ?? '').split(',').filter(Boolean),
  }
}

/** The URL for a view, leaving out whatever is the default so links stay short. */
export function writeView(view: ListView): URLSearchParams {
  const out = new URLSearchParams()
  if (view.q) out.set('q', view.q)
  if (view.plan) out.set('plan', view.plan)
  if (view.status) out.set('status', view.status)
  if (view.sort !== 'created_at') out.set('sort', view.sort)
  if (view.order !== defaultOrder(view.sort)) out.set('order', view.order)
  if (view.limit !== DEFAULT_LIMIT) out.set('limit', String(view.limit))
  if (view.pages.length > 0) out.set('pages', view.pages.join(','))
  return out
}

/** A domain as the API takes it, or null when it cannot be one. */
export function normalizeDomain(input: string): string | null {
  const domain = input.trim().toLowerCase().replace(/^@/, '')
  if (!domain) return ''
  return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
    ? domain
    : null
}

/** A rough check of an address; the server has the final word. */
export function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}
