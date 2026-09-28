// Generated from specs/audit.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/audit/events': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Record an entry (services only) */
    post: operations['recordAuditEvent']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/audit-events': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** An org's entries, newest first */
    get: operations['listAuditEvents']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/audit-events/export': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * An org's entries as CSV, oldest first, for a compliance request
     * @description The same filters as the list, every matching entry up to 50,000, one
     *     row each: when, actor, action, target, source address, request, and
     *     the details as JSON. Ids only; names are resolved by whoever reads it.
     */
    get: operations['exportAuditEvents']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/data': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** Everything this service keeps for an org, for its export (the organization service only) */
    get: operations['exportOrgData']
    put?: never
    post?: never
    /** Delete everything this service keeps for an org, and count what is left (the organization service only) */
    delete: operations['purgeOrgData']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/users/{user_id}/data': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** What this service keeps about one person, for their own export (the organization service only) */
    get: operations['exportUserData']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/audit/expire': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Delete an org's entries older than an instant, for its audit retention (the organization service only)
     * @description The organization service's daily loop applies each org's audit
     *     retention (13 months by default, up to 7 years on enterprise) by
     *     calling this with the cut-off. Retention and an org's purge are the
     *     only ways an entry is ever removed.
     */
    post: operations['expireAuditEvents']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
}
export type webhooks = Record<string, never>
export interface components {
  schemas: {
    DataPart: {
      service: string
      data: {
        [key: string]: unknown
      }
      files: {
        key: string
        name: string
      }[]
    }
    DataPurged: {
      remaining: number
    }
    NewAuditEvent: {
      /** Format: uuid */
      org_id: string
      /**
       * @description membership:<uuid>, user:<uuid> or system:<service>. Never a name or an email.
       * @example membership:01922b5e-0000-7000-8000-0000000000c1
       */
      actor: string
      /**
       * @description Dotted, stable, lower case.
       * @example organization.plan.changed
       */
      action: string
      /** @example organization */
      target_type: string
      target_id: string
      source_ip?: string
      request_id?: string
      /**
       * Format: date-time
       * @description When it happened, if not now.
       */
      occurred_at?: string
      /** @description Ids and values only, never a name or an email. */
      details?: {
        [key: string]: unknown
      }
    }
    AuditEvent: {
      /** Format: uuid */
      id: string
      /** Format: uuid */
      org_id: string
      /** Format: date-time */
      occurred_at: string
      actor: string
      action: string
      target_type: string
      target_id: string
      source_ip?: string
      request_id?: string
      details: {
        [key: string]: unknown
      }
    }
    AuditEventPage: {
      events: components['schemas']['AuditEvent'][]
      /** @description Present when there is another page. */
      next_cursor?: string
    }
    Error: {
      code: string
      message: string
      fields?: {
        [key: string]: string
      }
    }
  }
  responses: {
    /** @description The error envelope */
    Error: {
      headers: {
        [name: string]: unknown
      }
      content: {
        'application/json': components['schemas']['Error']
      }
    }
  }
  parameters: {
    OrgId: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  recordAuditEvent: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewAuditEvent']
      }
    }
    responses: {
      /** @description Recorded */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AuditEvent']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listAuditEvents: {
    parameters: {
      query?: {
        /** @description From the previous page's next_cursor. Omit for the first page. */
        cursor?: string
        limit?: number
        /** @description Only entries whose action starts with this, such as `organization.` */
        action?: string
        actor?: string
        target_type?: string
        target_id?: string
        /** @description Entries at or after this instant. */
        from?: string
        /** @description Entries before this instant. */
        to?: string
        order?: 'newest' | 'oldest'
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description One page */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AuditEventPage']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  exportAuditEvents: {
    parameters: {
      query?: {
        /** @description Only entries whose action starts with this, such as `organization.` */
        action?: string
        actor?: string
        target_type?: string
        target_id?: string
        /** @description Entries at or after this instant. */
        from?: string
        /** @description Entries before this instant. */
        to?: string
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The entries */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'text/csv': string
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  exportOrgData: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description This service's part of the export */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DataPart']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  purgeOrgData: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Purged; remaining is zero when nothing of the org is left */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DataPurged']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  exportUserData: {
    parameters: {
      query?: {
        /** @description Each of the person's memberships, as org_id:membership_id. */
        membership?: string[]
      }
      header?: never
      path: {
        user_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description This service's part of the person's export */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DataPart']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  expireAuditEvents: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          /** Format: date-time */
          before: string
        }
      }
    }
    responses: {
      /** @description Expired */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            deleted: number
          }
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
}
