// Generated from specs/authorization.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/permission-groups': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The configurable permission groups, for the roles page to render
     * @description Every group registered in this deployment, the template's and the
     *     product's, in order, with a label and description to show and the
     *     roles that hold it by default; and the actions only an Owner may
     *     ever take. The same for every org; any signed-in caller may read it.
     */
    get: operations['listPermissionGroups']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/permissions': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The organization's permission configuration and what every role can do */
    get: operations['getPermissions']
    /**
     * Change which groups the Admin and Billing Admin roles hold (Owner only)
     * @description Only the registered groups (`GET /v1/permission-groups`) may be
     *     named; Owner-only actions never can. The answer carries warnings for anything the change leaves
     *     nobody but the Owner able to do. Audited. Takes effect on the next
     *     action: nothing is cached.
     */
    put: operations['setPermissions']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/memberships/{membership_id}/role': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Give a membership another org role (Owner only)
     * @description Owner is not assigned here: ownership is transferred instead
     *     (the ownership-transfer endpoints). The last Owner cannot be demoted. Audited.
     */
    put: operations['setRole']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/ownership-transfers': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The open ownership transfer, for the Owner and for the person asked */
    get: operations['listOwnershipTransfers']
    put?: never
    /**
     * Ask another member to take ownership (Owner only)
     * @description The target must be an active member who is not a guest; they must
     *     accept, so ownership is never dumped on someone unaware. One
     *     request is open at a time; a new one replaces it. It expires after
     *     seven days if not accepted. Both parties are emailed. Audited.
     */
    post: operations['requestOwnershipTransfer']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/ownership-transfers/{transfer_id}/accept': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Take ownership (the person asked only)
     * @description The target becomes Owner and the previous Owner becomes an Admin,
     *     not removed. Both are emailed. Audited. An expired, withdrawn or
     *     already accepted request is refused.
     */
    post: operations['acceptOwnershipTransfer']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/ownership-transfers/{transfer_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /** Withdraw the request (the Owner) or decline it (the person asked) */
    delete: operations['cancelOwnershipTransfer']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/memberships/{membership_id}/permissions': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * What one membership may do right now (services only)
     * @description Resolved at the moment of the action from the membership's role and
     *     the org's configuration. A deactivated or suspended membership has
     *     no permissions.
     */
    get: operations['getGrant']
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
    /**
     * @description An org role. Fixed in code; one per membership.
     * @enum {string}
     */
    Role: 'owner' | 'admin' | 'billing_admin' | 'user' | 'guest'
    /**
     * @description A configurable group, `settings`, or an Owner-only action. The groups
     *     are registered by the template (billing, users, audit, sso) and the
     *     product, so they are validated by the service, not listed here.
     * @example users
     */
    Permission: string
    PermissionGroup: {
      key: components['schemas']['Permission']
      /** @example Single sign-on */
      label: string
      description: string
      /** @description The configurable roles that hold it until the Owner decides otherwise. */
      default_roles: components['schemas']['Role'][]
    }
    PermissionGroups: {
      groups: components['schemas']['PermissionGroup'][]
      /** @description What no configuration can grant. */
      owner_only: components['schemas']['Permission'][]
    }
    NewPermissionConfig: {
      /** @description The configurable groups the Admin role holds. */
      admin: components['schemas']['Permission'][]
      billing_admin: components['schemas']['Permission'][]
    }
    PermissionConfig: {
      /** Format: uuid */
      org_id: string
      admin: components['schemas']['Permission'][]
      billing_admin: components['schemas']['Permission'][]
      /** @description Every permission each role has under this configuration, by role. */
      effective: {
        [key: string]: components['schemas']['Permission'][]
      }
      /** @description What this configuration leaves nobody but the Owner able to do. */
      warnings: string[]
    }
    OwnershipTransfer: {
      /** Format: uuid */
      transfer_id: string
      /** Format: uuid */
      org_id: string
      /**
       * Format: uuid
       * @description The Owner asking.
       */
      from_membership_id: string
      /**
       * Format: uuid
       * @description The member asked.
       */
      to_membership_id: string
      /** @enum {string} */
      status: 'pending' | 'accepted' | 'cancelled' | 'expired'
      /** Format: date-time */
      expires_at: string
      /** Format: date-time */
      accepted_at?: string
      /** Format: date-time */
      created_at: string
    }
    RoleAssignment: {
      /** Format: uuid */
      org_id: string
      /** Format: uuid */
      membership_id: string
      role: components['schemas']['Role']
    }
    Grant: {
      /** Format: uuid */
      org_id: string
      /** Format: uuid */
      membership_id: string
      role: components['schemas']['Role']
      permissions: components['schemas']['Permission'][]
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
    MembershipId: string
    TransferId: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  listPermissionGroups: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The groups */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PermissionGroups']
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getPermissions: {
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
      /** @description The configuration */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PermissionConfig']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setPermissions: {
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
        'application/json': components['schemas']['NewPermissionConfig']
      }
    }
    responses: {
      /** @description The configuration after the change, with warnings */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PermissionConfig']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setRole: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        membership_id: components['parameters']['MembershipId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          role: components['schemas']['Role']
        }
      }
    }
    responses: {
      /** @description The membership's role after the change */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['RoleAssignment']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description The change would leave the organization without an Owner */
      409: {
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
  listOwnershipTransfers: {
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
      /** @description The open requests the caller is party to */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            transfers: components['schemas']['OwnershipTransfer'][]
          }
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  requestOwnershipTransfer: {
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
          /** Format: uuid */
          to_membership_id: string
        }
      }
    }
    responses: {
      /** @description The request */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['OwnershipTransfer']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  acceptOwnershipTransfer: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        transfer_id: components['parameters']['TransferId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The transfer, accepted */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['OwnershipTransfer']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description The request is no longer open */
      409: {
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
  cancelOwnershipTransfer: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        transfer_id: components['parameters']['TransferId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Ended; nothing changed */
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
  getGrant: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        membership_id: components['parameters']['MembershipId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The grant */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Grant']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
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
}
