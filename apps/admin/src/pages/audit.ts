/**
 * The audit log's view (UO-85): its filters live in the URL, so a view can
 * be linked to (the user page links to one person's history) or reloaded.
 */

export interface AuditView {
  action: string
  actor: string
  targetType: string
  targetId: string
  /** Calendar days, yyyy-mm-dd, in the viewer's own time zone. */
  from: string
  to: string
  order: 'newest' | 'oldest'
}

export function readAuditView(params: URLSearchParams): AuditView {
  return {
    action: params.get('action') ?? '',
    actor: params.get('actor') ?? '',
    targetType: params.get('target_type') ?? '',
    targetId: params.get('target_id') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    order: params.get('order') === 'oldest' ? 'oldest' : 'newest',
  }
}

export function writeAuditView(view: AuditView): URLSearchParams {
  const out = new URLSearchParams()
  const set = (key: string, value: string) => value && out.set(key, value)
  set('action', view.action.trim())
  set('actor', view.actor.trim())
  set('target_type', view.targetType.trim())
  set('target_id', view.targetId.trim())
  set('from', view.from)
  set('to', view.to)
  if (view.order === 'oldest') out.set('order', 'oldest')
  return out
}

/**
 * The API's query for a view. The dates are whole days where the viewer is:
 * from the start of the first to the start of the day after the last.
 */
export function auditQuery(view: AuditView): Record<string, string> {
  const query: Record<string, string> = {}
  if (view.action.trim()) query.action = view.action.trim()
  if (view.actor.trim()) query.actor = view.actor.trim()
  if (view.targetType.trim()) query.target_type = view.targetType.trim()
  if (view.targetId.trim()) query.target_id = view.targetId.trim()
  if (view.from) query.from = startOfDay(view.from).toISOString()
  if (view.to) {
    const end = startOfDay(view.to)
    end.setDate(end.getDate() + 1)
    query.to = end.toISOString()
  }
  if (view.order === 'oldest') query.order = 'oldest'
  return query
}

function startOfDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** The membership an actor names, when it names one: `membership:<id>`. */
export function membershipOf(actor: string): string | null {
  return actor.startsWith('membership:') ? actor.slice('membership:'.length) : null
}
