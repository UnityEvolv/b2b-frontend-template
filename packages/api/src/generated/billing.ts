// Generated from specs/billing.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/organizations/{org_id}/billing': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * What the org is on and paying, for the billing page and its banners
     * @description The billing permission reads it; the banners across the admin app read it too.
     */
    get: operations['getBilling']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/billing/setup': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** The provider's hosted form, to add or replace the payment method, address and tax ID */
    post: operations['startSetup']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/billing/band': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /** Move to another band; up applies now with proration, down at the period's end */
    put: operations['changeBand']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/billing/band-preview': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** What moving to a band would charge today */
    get: operations['previewBand']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/billing/pending': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /** Cancel a scheduled downgrade */
    delete: operations['cancelPending']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/billing/trial': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Start the one team trial, 14 days, on a free org */
    post: operations['startTrial']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/billing/auto-upgrade': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /** Turn automatic upgrade on or off (Owner only) */
    put: operations['setAutoUpgrade']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/billing/invoices': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The org's invoices from the provider, newest first */
    get: operations['listInvoices']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/capacity': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Room for this many active members, by an automatic upgrade if it is on (the user service only)
     * @description Called before an invite or import that would pass the cap is
     *     committed. Answers the band the org is on after any upgrade, or a
     *     refusal when there is no room and none can be made.
     */
    post: operations['makeRoom']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/members-changed': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** The active member count moved (the user service only); billing warns at 80% of the cap */
    post: operations['membersChanged']
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
  '/v1/internal/organizations/{org_id}/close': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * The org is closing; cancel its subscription now (the organization service only)
     * @description Cancels the provider subscription immediately and records the account
     *     as cancelled on the free band. Idempotent: an org with no
     *     subscription is a no-op.
     */
    post: operations['closeAccount']
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
    Error: {
      code: string
      message: string
      fields?: {
        [key: string]: string
      }
    }
    /** @description A plan band, one of the bands the deployment registers. */
    Band: string
    Price: {
      /**
       * Format: int64
       * @description Minor units.
       */
      amount: number
      currency: string
      interval: string
    }
    Billing: {
      band: components['schemas']['Band']
      /** @enum {string} */
      state: 'free' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'invoiced'
      /** Format: date-time */
      period_end?: string
      pending_band?: components['schemas']['Band']
      card?: {
        brand: string
        last4: string
      }
      auto_upgrade: boolean
      /** @description Whether the caller is an Owner, who alone may change it. */
      can_manage_auto_upgrade: boolean
      trial_available: boolean
      /** Format: date-time */
      trial_ends_at?: string
      /** @description While past due, days left before the org drops to free. */
      grace_days_left?: number
      /** @description Enterprise, invoiced by contract; no controls. */
      invoiced: boolean
      active_members: number
      /** @description 0 means no cap. */
      users_cap: number
      next_band?: components['schemas']['Band']
      /**
       * @description Every band the billing page may offer, lowest first: the lowest
       *     band, which has no price (a move to it is a downgrade at the
       *     period's end, or the end of a trial), then every self-serve band.
       *     Contractual bands are never listed. Labels and what each allows are
       *     at the organization service's GET /v1/plans.
       */
      bands: components['schemas']['Band'][]
      /**
       * @description Whether a payment provider is configured here. When false, no
       *     band with a price can be bought: startSetup, changeBand to any band
       *     but the lowest, and band-preview of any band but the lowest answer
       *     503 `billing.provider_not_configured`, and prices is empty. The
       *     trial, and moving from a trial to the lowest band, still work.
       */
      provider_configured: boolean
      /** @description The price of each band the payment provider sells, by band. A band in bands with no entry here costs nothing. */
      prices: {
        [key: string]: components['schemas']['Price']
      }
    }
    BandPreview: {
      band: components['schemas']['Band']
      /**
       * Format: int64
       * @description Charged now, with proration; 0 for a change at the period's end.
       */
      amount_today: number
      currency: string
      /** @enum {string} */
      applies: 'now' | 'period_end'
    }
    Invoice: {
      id: string
      number?: string
      status: string
      /** Format: int64 */
      amount: number
      currency: string
      /** Format: date-time */
      created: string
      pdf?: string
      pay_url?: string
      /** Format: date-time */
      next_attempt?: string
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
  getBilling: {
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
      /** @description The account */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Billing']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  startSetup: {
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
      /** @description Where to send the browser */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            url: string
          }
        }
      }
      403: components['responses']['Error']
      /** @description No payment provider is configured here (`billing.provider_not_configured`). */
      503: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      default: components['responses']['Error']
    }
  }
  changeBand: {
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
          band: components['schemas']['Band']
        }
      }
    }
    responses: {
      /** @description The account after the change */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Billing']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      409: components['responses']['Error']
      /** @description No payment provider is configured here (`billing.provider_not_configured`). */
      503: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      default: components['responses']['Error']
    }
  }
  previewBand: {
    parameters: {
      query: {
        band: components['schemas']['Band']
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The charge */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BandPreview']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      /** @description No payment provider is configured here (`billing.provider_not_configured`). */
      503: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      default: components['responses']['Error']
    }
  }
  cancelPending: {
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
      /** @description The account */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Billing']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  startTrial: {
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
      /** @description The account, trialing */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Billing']
        }
      }
      403: components['responses']['Error']
      409: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setAutoUpgrade: {
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
          on: boolean
        }
      }
    }
    responses: {
      /** @description The account */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Billing']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listInvoices: {
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
      /** @description The invoices */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            invoices: components['schemas']['Invoice'][]
          }
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  makeRoom: {
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
          members: number
        }
      }
    }
    responses: {
      /** @description There is room */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            band: components['schemas']['Band']
            upgraded: boolean
          }
        }
      }
      403: components['responses']['Error']
      409: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  membersChanged: {
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
          members: number
        }
      }
    }
    responses: {
      /** @description Noted */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
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
  closeAccount: {
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
      /** @description Closed */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
}
