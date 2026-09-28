// Generated from specs/organization.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/organizations': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** Every organization on the platform, a page at a time (platform operators) */
    get: operations['listOrganizations']
    put?: never
    /**
     * Create an organization (platform operators)
     * @description The organization is the top-level tenant. It starts on the free plan
     *     with its first data key. The Idempotency-Key header is required: a
     *     retried request with the same key returns the organization the first
     *     one created and never makes a second.
     */
    post: operations['createOrganization']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One organization */
    get: operations['getOrganization']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    /**
     * Change an organization's settings
     * @description Only the fields sent change. Sending null for display_name or domain
     *     clears it. The plan is not a setting; the plan story changes it.
     */
    patch: operations['updateOrganization']
    trace?: never
  }
  '/v1/organizations/{org_id}/plan': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Move the organization to another plan (platform operators, until billing)
     * @description Audited on the org. A downgrade closes doors going forward and never
     *     deletes anything or removes anyone; the checklist of what stops is
     *     at GET /plan-change. Limits are read at the moment of every action,
     *     so the change takes effect on the next attempt with no sign-out.
     */
    put: operations['changePlan']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/close': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Close the organization; it is deleted 30 days later (the Owner, or a platform operator with a reason)
     * @description Nothing is deleted now. Every session in the org ends within a
     *     minute, sign-in is refused with a message that it is closing, and its
     *     paid subscription is cancelled. For 30 days an Owner can reopen it
     *     from the link emailed when it closed, and everything comes back. After
     *     that the daily loop purges every record and file, service by service,
     *     checks each is empty, and keeps only the fact that the org existed.
     *     The Owner types the organization's name to confirm.
     */
    post: operations['closeOrganization']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/reopen': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Reopen a closing organization with the emailed link (public; the link is the proof) */
    post: operations['reopenOrganization']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/reopen-link': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Email a fresh reopen link to a closing organization's Owner (public; always accepted)
     * @description What the sign-in page offers when it says an organization is closing. The answer is the same whether or not anything was sent.
     */
    post: operations['requestReopenLink']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/retention': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** What the platform keeps of this organization, and for how long */
    get: operations['getRetention']
    /** Change the organization's audit log retention (platform operators; beyond 13 months on enterprise only) */
    put: operations['setRetention']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/exports': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The organization's recent exports (Owners) */
    get: operations['listOrgExports']
    put?: never
    /**
     * Ask for an export of everything the organization has (Owners)
     * @description Produced within the hour by the daily loop's export pass, and emailed as a download link that lasts 7 days.
     */
    post: operations['createOrgExport']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/me/exports': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** My recent exports */
    get: operations['listPersonalExports']
    put?: never
    /** Ask for an export of everything about me, across every organization */
    post: operations['createPersonalExport']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/status': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Suspend or reactivate the organization (platform operators)
     * @description Suspension keeps every record and removes nobody. Members cannot get
     *     a session in a suspended org: open sessions move elsewhere or to the
     *     chooser at their next refresh. Audited on the org with the reason.
     */
    put: operations['setOrganizationStatus']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/plan-change': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** What a move to another plan would close, for the admin to confirm */
    get: operations['previewPlanChange']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/signups': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Sign up to create an organization
     * @description No sales call: an email, a name, the organization's name and time
     *     zone. The address must be proven before anything is created, so a
     *     link is emailed; nothing else happens until it is used. Needs a
     *     CAPTCHA token. An address at a domain another organization has
     *     claimed is refused and pointed at requesting access instead; a
     *     public mailbox domain (gmail.com and the like) claims nothing.
     *     Always 202 otherwise: whether an address was sent a link lately is
     *     not something this endpoint tells, and a person gets a few an hour.
     */
    post: operations['startSignup']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/signups/complete': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Use the link: prove the address and create the organization
     * @description One use. The organization is created with the signer-up as its
     *     Owner, the domain claimed when it is not a public mailbox
     *     provider, and a local account started as verified. The answer
     *     carries the token for setting the first password.
     */
    post: operations['completeSignup']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/domain': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The organization's domain claim and how to prove a pending one */
    get: operations['getDomain']
    /**
     * Start claiming a domain
     * @description The settings permission. The domain waits until a TXT record proves
     *     it (`POST …/domain/verify`); until then it counts for nothing. A
     *     domain another organization holds is refused. A platform operator
     *     may set a domain directly through the organization's settings.
     */
    put: operations['setDomain']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/domain/verify': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Look for the TXT record and claim the pending domain */
    post: operations['verifyDomain']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/frames': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The organization's festival frames and how each is set (Admins, Owners)
     * @description Every platform frame with its default and effective dates and whether
     *     it is on, the organization's own frames, and the one decorations
     *     switch. A platform frame the organization has never touched is on,
     *     with its default dates; one with no default dates (celebration) is off
     *     until it is given dates. Platform frame images are static paths the
     *     web app ships; the organization's own are signed links good for an hour.
     */
    get: operations['getFrameSettings']
    put?: never
    /**
     * Add one of the organization's own frames (Admins, Owners)
     * @description The images are uploads made with links from the uploads endpoint. Each
     *     is fetched and checked before the frame is created: a PNG or WebP of
     *     at most 5 MB, with transparency, of the canvas shape it is for
     *     (landscape 16:9, square 1:1, portrait 3:4, at the same resolutions a
     *     background takes). A light image for every shape is required; a dark
     *     one is optional and the light one is used in its place. The dates are
     *     calendar dates in the organization's time zone, both included, and do
     *     not repeat. At most 50 frames per organization.
     */
    post: operations['createOrgFrame']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/frames/uploads': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Links to upload the images of a new frame (Admins, Owners)
     * @description One pre-signed PUT per image the client will send, each good for 15
     *     minutes. The client PUTs the file's bytes to upload_url with the
     *     Content-Type it declared here, then names the returned keys when it
     *     creates the frame. Nothing is checked until then.
     */
    post: operations['createFrameUploads']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/frames/{frame_key}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Turn a platform frame on or off, or change its yearly dates (Admins, Owners)
     * @description Dates are month-day, MM-DD, and repeat every year; a start after the
     *     end wraps the year (12-31 to 01-02). start_md and end_md go together:
     *     both left out keeps the dates as they are, both null goes back to the
     *     defaults. A frame with no default dates cannot be turned on without dates.
     */
    put: operations['setPlatformFrame']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/frames/org/{frame_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /** Remove one of the organization's own frames and its images (Admins, Owners) */
    delete: operations['deleteOrgFrame']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/decorations': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Turn every frame on or off for the organization (Admins, Owners)
     * @description Off shows no frame at all, whatever each frame's own setting. The settings are kept.
     */
    put: operations['setDecorations']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/frame': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The one frame showing over the office on a date (any member)
     * @description Dates are the organization's time zone. The organization's own frame
     *     wins over a platform frame; among platform frames, the one most
     *     recently turned on. None when decorations are off or nothing is on.
     *     Platform frame images are static paths the web app ships; the
     *     organization's own are signed links good for an hour.
     */
    get: operations['getActiveFrame']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/domains/{domain}/organization': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The organization that claimed an email domain (services only)
     * @description The identity service resolves which org's identity provider a person
     *     signs in through from the domain of the address they typed.
     */
    get: operations['getOrganizationByDomain']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * An organization's record, for a service acting on its behalf (services only)
     * @description The name for an email sent on the org's behalf, the time zone for a schedule, the plan for a gate.
     */
    get: operations['getOrganizationInternal']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/plan': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The org's plan and its limits, for a service gating an action (services only)
     * @description Read at the moment of the action, never cached. The limits are the
     *     platform's table for the band, so a service can refuse with a message
     *     that names the plan and the next one up.
     */
    get: operations['getPlan']
    /**
     * Move the organization to another plan (the billing service only)
     * @description Billing's path to the plan: an upgrade, a downgrade, a trial's start
     *     or end, a payment failure. Audited on the org with the reason. An
     *     enterprise org is a platform operator's to move, never billing's.
     */
    put: operations['setPlanInternal']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/data-keys/current': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The org's current wrapped data key (services that may decrypt only) */
    get: operations['getCurrentDataKey']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/data-keys/{version}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One version of the org's wrapped data key */
    get: operations['getDataKeyVersion']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/data-keys/rotate': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Add a new data key version for the org (audited)
     * @description The new version becomes current; earlier versions stay readable until
     *     every secret written under them has been re-encrypted. Services only,
     *     until the platform admin role exists.
     */
    post: operations['rotateDataKey']
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
    WrappedDataKey: {
      /** Format: uuid */
      org_id: string
      version: number
      /**
       * Format: byte
       * @description The data key, encrypted by the KMS master key. Useless without KMS.
       */
      wrapped_key: string
      kms_key_version: string
    }
    /**
     * @description The plan band. What each band allows is read at the moment of every action.
     * @enum {string}
     */
    Plan: 'free' | 'team-50' | 'team-200' | 'team-500' | 'enterprise'
    PlanLimits: {
      /** Format: uuid */
      org_id: string
      plan: components['schemas']['Plan']
      /** @description Cap on active memberships. 0 means no cap in the product. */
      users: number
      /** @description Cap on active offices. 0 means no cap in the product. */
      offices: number
      min_message_retention_seconds: number
      max_message_retention_seconds: number
      /** Format: int64 */
      attachment_bytes: number
      /** @description The gated features this plan includes. Everything not gated is on every plan. */
      features: string[]
    }
    PlanChange: {
      from: components['schemas']['Plan']
      to: components['schemas']['Plan']
      downgrade: boolean
      consequences: components['schemas']['PlanConsequence'][]
    }
    PlanConsequence: {
      /** @description Stable; the admin page keys its explanation on it. */
      code: string
      message: string
    }
    /**
     * @description IANA time zone name, such as Asia/Kolkata. Never an offset. This is
     *     the organization's zone: festival frames, scheduled switches, grace
     *     periods and heat maps use it. A person's own zone is on their profile.
     * @example Asia/Kolkata
     */
    TimeZone: string
    NewOrganization: {
      name: string
      /** @description What people see in the office. Defaults to the name. */
      display_name?: string
      /** @description The email domain the organization claims, such as acme.com. One organization per domain. */
      domain?: string
      time_zone: components['schemas']['TimeZone']
      /**
       * Format: uuid
       * @description The first owner. Set when the person exists already; self-serve signup sets it to the signer-up.
       */
      owner_user_id?: string
    }
    NewSignup: {
      email: string
      /** @description The signer-up's own name. */
      name: string
      org_name: string
      time_zone: components['schemas']['TimeZone']
    }
    SignupCompleted: {
      /** Format: uuid */
      org_id: string
      /** Format: uuid */
      user_id: string
      /** Format: uuid */
      membership_id: string
      /** @description Whether the address's domain is now the organization's. */
      domain_claimed: boolean
      /** @description For setting the first password with the identity service; one use, fifteen minutes. */
      setup_token?: string
    }
    DomainClaim: {
      /** @description The claimed domain, when one is. */
      domain?: string
      /** Format: date-time */
      verified_at?: string
      verified: boolean
      pending_domain?: string
      /** @description The DNS name to publish the record at, for a pending domain. */
      txt_name?: string
      /** @description The record's value. */
      txt_value?: string
    }
    OrganizationSettings: {
      name?: string
      display_name?: string | null
      domain?: string | null
      time_zone?: components['schemas']['TimeZone']
      /**
       * @description Whether people may give control of their screen during a share
       *     (UO-216). Off refuses every new grant, however it is asked for;
       *     one already running ends with its share.
       */
      remote_control?: boolean
    }
    /** @enum {string} */
    OrganizationStatus: 'active' | 'suspended' | 'closing'
    Retention: {
      /** @description How long the audit log is kept, in months. */
      audit_months: number
      /** @description Whether a platform operator may lengthen it (enterprise). */
      audit_configurable: boolean
      classes: {
        /** @enum {string} */
        class: 'identity' | 'audit' | 'usage' | 'messages' | 'transient' | 'backups'
        /** @description How long, in words, the same every time for every org. */
        kept: string
      }[]
    }
    DataExport: {
      /** Format: uuid */
      id: string
      /** @enum {string} */
      kind: 'organization' | 'personal'
      /** @enum {string} */
      status: 'pending' | 'ready' | 'failed' | 'expired'
      /** Format: date-time */
      requested_at: string
      /** Format: date-time */
      ready_at?: string
      /** Format: date-time */
      expires_at?: string
      /** @description While ready, a link that works for an hour. The same link is emailed for 7 days. */
      download_url?: string
    }
    DataExportList: {
      exports: components['schemas']['DataExport'][]
    }
    Organization: {
      /** Format: uuid */
      org_id: string
      name: string
      /** @description Present when it differs from the name. */
      display_name?: string
      domain?: string
      plan: components['schemas']['Plan']
      /** @description Active members the plan allows. Absent on a plan with no cap. */
      user_cap?: number
      status: components['schemas']['OrganizationStatus']
      /** Format: date-time */
      suspended_at?: string
      suspension_reason?: string
      /**
       * Format: date-time
       * @description When it was closed; present while it is closing.
       */
      closing_at?: string
      /**
       * Format: date-time
       * @description When everything in it is deleted; present while it is closing.
       */
      purge_after?: string
      time_zone: components['schemas']['TimeZone']
      /** @description Whether people may give control of their screen during a share. */
      remote_control?: boolean
      /** Format: uuid */
      owner_user_id?: string
      /** Format: date-time */
      created_at: string
      /** Format: date-time */
      last_modified_at: string
    }
    OrganizationPage: {
      organizations: components['schemas']['Organization'][]
      /** @description Present when there is another page. */
      next_cursor?: string
    }
    /**
     * @description A template canvas shape. Landscape is 16:9, square 1:1, portrait 3:4.
     * @enum {string}
     */
    CanvasShape: 'landscape' | 'square' | 'portrait'
    /** @enum {string} */
    PlatformFrameKey:
      'christmas' | 'new_year' | 'diwali' | 'holi' | 'eid' | 'easter' | 'halloween' | 'celebration'
    /** @enum {string} */
    FrameVariant: 'light' | 'dark'
    FrameImage: {
      /** @description A static path (platform frames) or a signed link (the organization's own). */
      light: string
      /** @description Absent when there is none; the light image is used in dark mode. */
      dark?: string
    }
    FrameImages: {
      landscape: components['schemas']['FrameImage']
      square: components['schemas']['FrameImage']
      portrait: components['schemas']['FrameImage']
    }
    PlatformFrame: {
      key: components['schemas']['PlatformFrameKey']
      name: string
      /** @description An icon name from the web app's icon set. */
      icon: string
      /** @description Whether it shows on its dates. An enabled frame always has dates. */
      enabled: boolean
      /** @description Whether the organization has set its own dates. */
      customized: boolean
      /** @description MM-DD. Absent for a frame with no default dates. */
      default_start_md?: string
      /** @description MM-DD. Absent for a frame with no default dates. */
      default_end_md?: string
      /** @description MM-DD, the dates in effect. Absent when it has none. */
      start_md?: string
      /** @description MM-DD, the dates in effect. Absent when it has none. */
      end_md?: string
      /**
       * Format: date-time
       * @description When the organization last turned it on; absent when it is on by default.
       */
      enabled_at?: string
      images: components['schemas']['FrameImages']
    }
    PlatformFrameUpdate: {
      enabled: boolean
      /** @description MM-DD. Left out keeps the dates; null goes back to the default. */
      start_md?: string | null
      /** @description MM-DD. Left out keeps the dates; null goes back to the default. */
      end_md?: string | null
    }
    OrgFrame: {
      /** Format: uuid */
      id: string
      name: string
      icon: string
      /** Format: date */
      start_date: string
      /** Format: date */
      end_date: string
      images: components['schemas']['FrameImages']
      /** Format: date-time */
      created_at: string
    }
    NewOrgFrameImage: {
      /** @description The key of an upload from the uploads endpoint. */
      light: string
      dark?: string
    }
    NewOrgFrame: {
      name: string
      /** @description An icon name from the web app's icon set, lower-case letters, digits and dashes. confetti when left out. */
      icon?: string
      /** @description YYYY-MM-DD, in the organization's time zone. */
      start_date: string
      /** @description YYYY-MM-DD, included; on or after the start. */
      end_date: string
      images: {
        landscape: components['schemas']['NewOrgFrameImage']
        square: components['schemas']['NewOrgFrameImage']
        portrait: components['schemas']['NewOrgFrameImage']
      }
    }
    FrameSettings: {
      decorations_enabled: boolean
      /** @description The organization's time zone, which every frame date is in. */
      time_zone: string
      platform_frames: components['schemas']['PlatformFrame'][]
      /** @description Newest first. */
      org_frames: components['schemas']['OrgFrame'][]
    }
    Decorations: {
      enabled: boolean
    }
    FrameUploadFile: {
      shape: components['schemas']['CanvasShape']
      variant: components['schemas']['FrameVariant']
      /** @description image/png or image/webp. */
      content_type: string
      /**
       * Format: int64
       * @description Bytes, exactly, at most 5 MB; the upload must be this size.
       */
      size: number
    }
    FrameUploadRequest: {
      /** @description 1 to 6 files, each shape and variant at most once. */
      files: components['schemas']['FrameUploadFile'][]
    }
    FrameUpload: {
      shape: components['schemas']['CanvasShape']
      variant: components['schemas']['FrameVariant']
      /** @description What to name in the new frame's images. */
      key: string
      /** @description PUT the bytes here, with the Content-Type below. */
      upload_url: string
      content_type: string
      /** Format: date-time */
      expires_at: string
    }
    FrameUploads: {
      uploads: components['schemas']['FrameUpload'][]
    }
    ActiveFrame: {
      /** @enum {string} */
      kind: 'platform' | 'organization'
      key?: components['schemas']['PlatformFrameKey']
      /**
       * Format: uuid
       * @description The organization's own frame's id.
       */
      id?: string
      name: string
      icon: string
      /**
       * Format: date
       * @description The first day of this showing.
       */
      start_date: string
      /**
       * Format: date
       * @description The last day of this showing.
       */
      end_date: string
      images: components['schemas']['FrameImages']
    }
    ActiveFrameResponse: {
      /**
       * Format: date
       * @description The date the answer is for, in the organization's time zone.
       */
      date: string
      /** @description The frame showing, or null when none is. */
      frame: components['schemas']['ActiveFrame'] | null
    }
    Error: {
      /**
       * @description Stable, machine-readable. Clients branch on this.
       * @example organization.not_found
       */
      code: string
      /** @description For a person. Never parsed. */
      message: string
      /** @description The inputs that were wrong, when there were any. */
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
    /**
     * @description A key the client makes up once per intended create and reuses on
     *     every retry of it. A second request with the same key returns what
     *     the first one made.
     */
    IdempotencyKey: string
    OrgId: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  listOrganizations: {
    parameters: {
      query?: {
        /** @description The next_cursor of the previous page. Omit for the first page. */
        cursor?: string
        limit?: number
        /** @description The field to order by. The sort is stable across pages. */
        sort?: 'created_at' | 'name'
        /** @description Newest first by default when sorting by created_at; A to Z by name. */
        order?: 'asc' | 'desc'
        /** @description A prefix of the name or the domain, case-insensitive. */
        q?: string
        plan?: components['schemas']['Plan']
        status?: components['schemas']['OrganizationStatus']
      }
      header?: never
      path?: never
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
          'application/json': components['schemas']['OrganizationPage']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createOrganization: {
    parameters: {
      query?: never
      header: {
        /**
         * @description A key the client makes up once per intended create and reuses on
         *     every retry of it. A second request with the same key returns what
         *     the first one made.
         */
        'Idempotency-Key': components['parameters']['IdempotencyKey']
      }
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewOrganization']
      }
    }
    responses: {
      /** @description The organization, whether created now or by the first request with this key */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The domain is claimed by another organization, or the key was used for a different request */
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
  getOrganization: {
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
      /** @description The organization */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  updateOrganization: {
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
        'application/json': components['schemas']['OrganizationSettings']
      }
    }
    responses: {
      /** @description The organization after the change */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description The domain is claimed by another organization */
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
  changePlan: {
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
          plan: components['schemas']['Plan']
        }
      }
    }
    responses: {
      /** @description The organization on its new plan */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  closeOrganization: {
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
          confirm_name: string
          /** @description Why, for the audit log. Required of a platform operator. */
          reason?: string
        }
      }
    }
    responses: {
      /** @description The organization, now closing */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      409: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  reopenOrganization: {
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
          token: string
        }
      }
    }
    responses: {
      /** @description Reopened */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** Format: uuid */
            org_id: string
            status: components['schemas']['OrganizationStatus']
          }
        }
      }
      400: components['responses']['Error']
      404: components['responses']['Error']
      410: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  requestReopenLink: {
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
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      default: components['responses']['Error']
    }
  }
  getRetention: {
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
      /** @description The schedule that applies */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Retention']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setRetention: {
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
          audit_months: number
        }
      }
    }
    responses: {
      /** @description The schedule as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Retention']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listOrgExports: {
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
      /** @description Newest first */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DataExportList']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createOrgExport: {
    parameters: {
      query?: never
      header: {
        /**
         * @description A key the client makes up once per intended create and reuses on
         *     every retry of it. A second request with the same key returns what
         *     the first one made.
         */
        'Idempotency-Key': components['parameters']['IdempotencyKey']
      }
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DataExport']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      429: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listPersonalExports: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Newest first */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DataExportList']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createPersonalExport: {
    parameters: {
      query?: never
      header: {
        /**
         * @description A key the client makes up once per intended create and reuses on
         *     every retry of it. A second request with the same key returns what
         *     the first one made.
         */
        'Idempotency-Key': components['parameters']['IdempotencyKey']
      }
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DataExport']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      429: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setOrganizationStatus: {
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
          status: components['schemas']['OrganizationStatus']
          /** @description Why, for the audit log. Required to suspend. */
          reason?: string
        }
      }
    }
    responses: {
      /** @description The organization as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  previewPlanChange: {
    parameters: {
      query: {
        plan: components['schemas']['Plan']
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The checklist. Empty consequences means nothing closes. */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PlanChange']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  startSignup: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewSignup']
      }
    }
    responses: {
      /** @description A link is on its way */
      202: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      400: components['responses']['Error']
      /** @description The CAPTCHA check did not pass */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      /** @description Another organization has claimed the address's domain; request access to it instead */
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
  completeSignup: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          token: string
        }
      }
    }
    responses: {
      /** @description Created */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['SignupCompleted']
        }
      }
      /** @description Not an open signup; the code says whether it was used or has expired */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      /** @description The domain was claimed by another organization meanwhile */
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
  getDomain: {
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
      /** @description The claim */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DomainClaim']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setDomain: {
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
          domain: string
        }
      }
    }
    responses: {
      /** @description The claim, pending, with the record to publish */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DomainClaim']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description Another organization has claimed this domain */
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
  verifyDomain: {
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
      /** @description Claimed */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['DomainClaim']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description No domain is pending */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      /** @description The record was not found, or another organization claimed the domain meanwhile */
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
  getFrameSettings: {
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
      /** @description The frames and their settings */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['FrameSettings']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createOrgFrame: {
    parameters: {
      query?: never
      header: {
        /**
         * @description A key the client makes up once per intended create and reuses on
         *     every retry of it. A second request with the same key returns what
         *     the first one made.
         */
        'Idempotency-Key': components['parameters']['IdempotencyKey']
      }
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewOrgFrame']
      }
    }
    responses: {
      /** @description The frame, whether created now or by the first request with this key */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['OrgFrame']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      409: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createFrameUploads: {
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
        'application/json': components['schemas']['FrameUploadRequest']
      }
    }
    responses: {
      /** @description One upload per file asked for, in the same order */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['FrameUploads']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setPlatformFrame: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        frame_key: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['PlatformFrameUpdate']
      }
    }
    responses: {
      /** @description The frame as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PlatformFrame']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  deleteOrgFrame: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        frame_id: string
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
  setDecorations: {
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
        'application/json': components['schemas']['Decorations']
      }
    }
    responses: {
      /** @description The switch as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Decorations']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getActiveFrame: {
    parameters: {
      query?: {
        /** @description A calendar date, YYYY-MM-DD; today in the organization's time zone when left out. */
        date?: string
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The frame, or null */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ActiveFrameResponse']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getOrganizationByDomain: {
    parameters: {
      query?: never
      header?: never
      path: {
        domain: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The organization */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getOrganizationInternal: {
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
      /** @description The organization */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Organization']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getPlan: {
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
      /** @description The plan and its limits */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PlanLimits']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setPlanInternal: {
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
          plan: components['schemas']['Plan']
          /** @enum {string} */
          reason:
            | 'upgrade'
            | 'downgrade'
            | 'trial_start'
            | 'trial_end'
            | 'payment_failure'
            | 'subscription'
        }
      }
    }
    responses: {
      /** @description The plan and its limits, after the change */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PlanLimits']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      409: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getCurrentDataKey: {
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
      /** @description The wrapped key. Unwrapping it is KMS's decision. */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['WrappedDataKey']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getDataKeyVersion: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        version: number
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The wrapped key */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['WrappedDataKey']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  rotateDataKey: {
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
      /** @description The new current key */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['WrappedDataKey']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
}
