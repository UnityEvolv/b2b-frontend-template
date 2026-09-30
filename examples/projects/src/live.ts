/**
 * The live-session seam: the product's own event type, declared on the
 * template's `LiveEventTypes`, which types `event.data` for `useLiveEvent`.
 * The backend's projects service publishes it when a project is shared with
 * someone, to that person's open sessions.
 */
declare module '@b2b-template/client' {
  interface LiveEventTypes {
    'project.shared': { project_id: string }
  }
}

export const PROJECT_SHARED = 'project.shared' as const
