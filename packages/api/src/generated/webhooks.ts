// Generated from specs/webhooks.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/organizations/{org_id}/webhook-event-types': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The event types an endpoint may subscribe to, and whether the org's plan has webhooks */
    get: operations['listWebhookEventTypes']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/webhook-endpoints': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The org's endpoints, oldest first */
    get: operations['listWebhookEndpoints']
    put?: never
    /**
     * Add an endpoint; its signing secret is in the answer, and only there
     * @description The URL is https on a public address. Refused with
     *     `plan.limit_reached` (403) when the org's plan does not have the
     *     webhooks feature, and with `webhooks.endpoint_limit` (409) at 20
     *     endpoints.
     */
    post: operations['createWebhookEndpoint']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One endpoint */
    get: operations['getWebhookEndpoint']
    put?: never
    post?: never
    /** Remove an endpoint and its deliveries */
    delete: operations['deleteWebhookEndpoint']
    options?: never
    head?: never
    /** Change an endpoint's URL, description, event types, or turn it on or off */
    patch: operations['updateWebhookEndpoint']
    trace?: never
  }
  '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}/rotate-secret': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Replace an endpoint's signing secret; the new one is in the answer, and only there
     * @description For the overlap (24 hours unless asked otherwise, at most 7 days)
     *     every delivery is signed with both the new secret and the one it
     *     replaced, so the receiver can switch over without dropping one.
     *     Rotating again during an overlap ends the oldest secret at once.
     */
    post: operations['rotateWebhookSecret']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/webhook-endpoints/{endpoint_id}/test': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Send a webhook.test event to this endpoint now, and answer with how it went */
    post: operations['sendWebhookTest']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/webhook-deliveries': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The org's deliveries, newest first */
    get: operations['listWebhookDeliveries']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/webhook-deliveries/{delivery_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One delivery, with the body sent and every attempt */
    get: operations['getWebhookDelivery']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/webhook-deliveries/{delivery_id}/resend': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Attempt a delivery again now, whatever its status, and answer with how it went
     * @description The same message, with the same webhook-id, signed afresh. A
     *     delivery that fails again stays failed, or pending with its retries
     *     left.
     */
    post: operations['resendWebhookDelivery']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/events': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Send an event to the org's endpoints that subscribe to it (services only)
     * @description A delivery is recorded for each subscribed, enabled endpoint before
     *     this answers, and attempted at once. The type must be registered;
     *     data carries ids, never a name or an email. Sending the same id
     *     twice is one event. Nothing is sent, and 202 still answered, when
     *     the org has no endpoint for the type or its plan has no webhooks.
     *     Over the org's cap, 429.
     */
    post: operations['emitWebhookEvent']
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
    /**
     * What this service keeps about one person, for their own export (the organization service only)
     * @description Nothing is kept about a person; the part says so.
     */
    get: operations['exportUserData']
    put?: never
    post?: never
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
    EventType: {
      /** @example member.added */
      type: string
      description: string
    }
    EventTypeList: {
      /** @description Whether the org's plan has webhooks now. When false, endpoints cannot be added and nothing is delivered. */
      available: boolean
      /** @description The lowest plan with webhooks, when the org's has none. */
      required_plan?: string
      event_types: components['schemas']['EventType'][]
    }
    Endpoint: {
      /** Format: uuid */
      id: string
      /** Format: uuid */
      org_id: string
      url: string
      description: string
      /** @description The types it receives; empty is every type. */
      event_types: string[]
      enabled: boolean
      /**
       * Format: date-time
       * @description When its secret was last rotated, if ever.
       */
      secret_rotated_at?: string
      /**
       * Format: date-time
       * @description While a rotation overlaps, when the old secret stops signing.
       */
      previous_secret_expires_at?: string
      /** Format: date-time */
      created_at: string
      /** Format: date-time */
      last_modified_at: string
    }
    EndpointWithSecret: {
      endpoint: components['schemas']['Endpoint']
      /** @description The signing secret, whsec_ and base64. Shown this once; it cannot be read again. */
      secret: string
    }
    NewEndpoint: {
      /** @description https, on a public address. */
      url: string
      description?: string
      /** @description Registered types only; empty or left out is every type. */
      event_types?: string[]
      /** @default true */
      enabled: boolean
    }
    EndpointUpdate: {
      url?: string
      description?: string
      event_types?: string[]
      enabled?: boolean
    }
    /**
     * @description pending until an attempt succeeds; failed once it has been tried six times, or its endpoint is turned off.
     * @enum {string}
     */
    DeliveryStatus: 'pending' | 'succeeded' | 'failed'
    Delivery: {
      /** Format: uuid */
      id: string
      /** Format: uuid */
      endpoint_id: string
      /**
       * Format: uuid
       * @description The webhook-id header, the same on every attempt.
       */
      message_id: string
      event_type: string
      status: components['schemas']['DeliveryStatus']
      attempts: number
      /**
       * Format: date-time
       * @description When a pending delivery is tried again.
       */
      next_attempt_at?: string
      /** Format: date-time */
      last_attempt_at?: string
      /** @description The endpoint's HTTP status on the last attempt; absent when it could not be reached. */
      last_status_code?: number
      last_latency_ms?: number
      last_error?: string
      /** Format: date-time */
      created_at: string
    }
    Attempt: {
      /** Format: uuid */
      id: string
      /** Format: date-time */
      attempted_at: string
      /** @description Sent by an admin (a resend or a test). */
      manual: boolean
      status_code?: number
      latency_ms: number
      error?: string
    }
    DeliveryDetail: components['schemas']['Delivery'] & {
      /** @description The body every attempt sends. */
      payload: {
        [key: string]: unknown
      }
      /** @description Every attempt, oldest first. */
      attempt_log: components['schemas']['Attempt'][]
    }
    DeliveryPage: {
      deliveries: components['schemas']['Delivery'][]
      /** @description Present when there is another page. */
      next_cursor?: string
    }
    NewEvent: {
      /**
       * Format: uuid
       * @description Makes the send idempotent; the same id twice is one event.
       */
      id?: string
      /** @example project.created */
      type: string
      /** Format: date-time */
      occurred_at?: string
      /** @description Ids and values only, never a name or an email. At most 16 KB. */
      data: {
        [key: string]: unknown
      }
    }
    EventAccepted: {
      /** Format: uuid */
      id: string
      /** @description How many endpoints it is being delivered to. */
      deliveries: number
    }
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
    EndpointId: string
    DeliveryId: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  listWebhookEventTypes: {
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
      /** @description The registered types */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EventTypeList']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listWebhookEndpoints: {
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
      /** @description Every endpoint */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            endpoints: components['schemas']['Endpoint'][]
          }
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createWebhookEndpoint: {
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
        'application/json': components['schemas']['NewEndpoint']
      }
    }
    responses: {
      /** @description Created */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EndpointWithSecret']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      409: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getWebhookEndpoint: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        endpoint_id: components['parameters']['EndpointId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The endpoint */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Endpoint']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  deleteWebhookEndpoint: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        endpoint_id: components['parameters']['EndpointId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Removed */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  updateWebhookEndpoint: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        endpoint_id: components['parameters']['EndpointId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['EndpointUpdate']
      }
    }
    responses: {
      /** @description Changed */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Endpoint']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  rotateWebhookSecret: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        endpoint_id: components['parameters']['EndpointId']
      }
      cookie?: never
    }
    requestBody?: {
      content: {
        'application/json': {
          /**
           * @description How long the old secret keeps signing. 0 ends it now.
           * @default 24
           */
          overlap_hours?: number
        }
      }
    }
    responses: {
      /** @description Rotated */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EndpointWithSecret']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  sendWebhookTest: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        endpoint_id: components['parameters']['EndpointId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Attempted; the delivery says whether it succeeded */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DeliveryDetail']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listWebhookDeliveries: {
    parameters: {
      query?: {
        /** @description Only this endpoint's. */
        endpoint_id?: string
        status?: components['schemas']['DeliveryStatus']
        /** @description From the previous page's next_cursor. Omit for the first page. */
        cursor?: string
        limit?: number
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
          'application/json': components['schemas']['DeliveryPage']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getWebhookDelivery: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        delivery_id: components['parameters']['DeliveryId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The delivery */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DeliveryDetail']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  resendWebhookDelivery: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        delivery_id: components['parameters']['DeliveryId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Attempted */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DeliveryDetail']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  emitWebhookEvent: {
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
        'application/json': components['schemas']['NewEvent']
      }
    }
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EventAccepted']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      429: components['responses']['Error']
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
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
}
