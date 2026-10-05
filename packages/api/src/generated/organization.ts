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
     *     clears it. The plan is not a setting; billing changes it.
     */
    patch: operations['updateOrganization']
    trace?: never
  }
  '/v1/plans': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The plan catalogue, for the plans and billing pages to render
     * @description Every band registered in this deployment, the template's or the
     *     product's, lowest first, with its label, whether it is contractual,
     *     its cap on every registered limit (0 means no cap) and the gated
     *     features it includes; and every registered limit and feature with
     *     its label. The same for every org; any signed-in caller may read it.
     *     Read from the registry at the moment of the request, never cached.
     */
    get: operations['listPlans']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/plan': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The org's plan, what it allows, and what the org uses now (its members, platform operators)
     * @description The band the org is on, with its label and whether it is
     *     contractual; the effective cap on every registered limit (0 means no
     *     cap) and the gated features on for the org, which is the band with
     *     the org's overrides in force applied; those overrides, each with its
     *     end, so the page marks what is the organization's agreement; and the
     *     org's current usage of the limits the template counts itself (users:
     *     active members). A product's own limits have no usage here; the
     *     product counts them. Everything is read at the moment of the
     *     request, never cached; the gate is the action itself, which reads
     *     the plan again.
     */
    get: operations['getOrganizationPlan']
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
  '/v1/organizations/{org_id}/plan-overrides': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Every override set for the organization, in force or ended (platform operators)
     * @description A platform operator's exceptions to the org's band, for an
     *     enterprise deal: a limit's cap raised or lowered, a feature granted
     *     or taken away, each with an optional end. One past its end has
     *     stopped applying and is listed with in_force false until it is
     *     removed or set again; nothing sweeps it.
     */
    get: operations['listPlanOverrides']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/plan-overrides/{kind}/{key}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Set the organization's override of one limit or feature (platform operators)
     * @description Replaces any override of the same limit or feature. The key must be
     *     a registered limit (with cap) or feature (with allowed). Checked at
     *     the moment of every action like the band itself: the band's value
     *     first, then this. Audited on the org as
     *     organization.plan.override_set, which the org's audit log shows.
     */
    put: operations['setPlanOverride']
    post?: never
    /**
     * Remove the organization's override of one limit or feature (platform operators)
     * @description The band's value applies again from the next action. Audited on the
     *     org as organization.plan.override_removed.
     */
    delete: operations['removePlanOverride']
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
     * @description The Owner only (`claim_domain`; an Admin is refused 403). The domain
     *     waits until a TXT record proves it (`POST …/domain/verify`); until
     *     then it counts for nothing. A
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
    /**
     * Look for the TXT record and claim the pending domain
     * @description The Owner only (`claim_domain`; an Admin is refused 403), as starting the claim is.
     */
    post: operations['verifyDomain']
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
     * @description Read at the moment of the action, never cached. The band, what the
     *     org may do with its overrides in force applied, and those overrides,
     *     so a service checks the band's value then the override, and refuses
     *     with a message that names the plan and the next one up.
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
  '/v1/organizations/{org_id}/onboarding': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The organization's first-run checklist, as it stands now
     * @description Every registered step, the core's then the product's, each derived
     *     now from the data that says whether it is done; nothing is a stored
     *     flag. Each step's service is asked at once, within two seconds: one
     *     that does not answer leaves its step unknown, never the checklist
     *     failed. Dismissals are the organization's. Needs the settings
     *     permission (an Owner or an Admin).
     */
    get: operations['getOnboarding']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/onboarding/dismissal': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Hide the whole checklist for the organization
     * @description Needs the settings permission. Audited (onboarding.dismissed).
     */
    post: operations['dismissOnboarding']
    /**
     * Show the checklist again
     * @description Needs the settings permission. Audited (onboarding.restored).
     */
    delete: operations['restoreOnboarding']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/onboarding/steps/{step_id}/dismissal': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Hide one step for the organization
     * @description Needs the settings permission. Audited (onboarding.step_dismissed).
     */
    post: operations['dismissOnboardingStep']
    /**
     * Show one step again
     * @description Needs the settings permission. Audited (onboarding.step_restored).
     */
    delete: operations['restoreOnboardingStep']
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
    /** @description The plan band, one of the bands the deployment registers (free, team, business and enterprise unless the product names others). What each band allows is read at the moment of every action. */
    Plan: string
    PlanLimits: {
      /** Format: uuid */
      org_id: string
      plan: components['schemas']['Plan']
      /** @description Sold by contract rather than self-serve; billing never moves an organization into or out of it. */
      contractual: boolean
      /** @description Every registered limit and its effective cap for this org, by key (users is the one every deployment has), its override's where one is in force, else the band's. 0 means no cap in the product. */
      limits: {
        [key: string]: number
      }
      /** @description The gated features on for this org, the band's with its overrides applied. Everything not gated is on every plan. */
      features: string[]
      /**
       * @description The org's overrides in force now, which limits and features
       *     already include. A gate checks the band's value first, then
       *     these.
       */
      overrides: components['schemas']['PlanOverride'][]
    }
    PlanOverride: {
      /** @enum {string} */
      kind: 'limit' | 'feature'
      /** @description The registered limit's or feature's key. */
      key: string
      /** @description For a limit, the cap that replaces the band's. 0 means no cap. */
      cap?: number
      /** @description For a feature, whether it is granted (true) or taken away (false), whatever the band says. */
      allowed?: boolean
      /**
       * Format: date-time
       * @description When the override stops applying; absent or null is never.
       */
      ends_at?: string | null
      /** @description Whether it applies now. One past its end has stopped. */
      in_force: boolean
    }
    PlanOverrideInput: {
      /** @description For a limit, the cap. 0 lifts it. */
      cap?: number
      /** @description For a feature, grant (true) or take away (false). */
      allowed?: boolean
      /**
       * Format: date-time
       * @description When it stops applying, in the future; absent or null is never.
       */
      ends_at?: string | null
    }
    PlanOverrideList: {
      overrides: components['schemas']['PlanOverride'][]
    }
    PlanCatalogue: {
      /** @description Every registered band, lowest first. */
      bands: components['schemas']['PlanBand'][]
      /** @description Every registered limit, in registration order (users first). */
      limits: components['schemas']['PlanLimitInfo'][]
      /** @description Every gated feature, in registration order. Anything not listed is on every plan. */
      features: components['schemas']['PlanFeatureInfo'][]
    }
    PlanBand: {
      name: components['schemas']['Plan']
      /** @description What a page calls the band, such as Team. */
      label: string
      /** @description Sold by contract rather than self-serve; billing never moves an organization into or out of it. */
      contractual: boolean
      /** @description Every registered limit's cap on this band, by key. 0 means no cap. */
      limits: {
        [key: string]: number
      }
      /** @description The gated features this band includes, by key. */
      features: string[]
    }
    PlanLimitInfo: {
      key: string
      /** @description The plural noun a message uses, such as users. */
      label: string
    }
    PlanFeatureInfo: {
      key: string
      /** @description What a message calls it, such as SCIM provisioning. */
      label: string
    }
    OrganizationPlan: {
      /** Format: uuid */
      org_id: string
      plan: components['schemas']['Plan']
      /** @description The band's label. */
      label: string
      contractual: boolean
      /** @description Every registered limit's effective cap for this org, by key, its override's where it has one in force, else the band's. 0 means no cap. */
      limits: {
        [key: string]: number
      }
      /** @description The gated features on for this org, by key, the band's with its overrides applied. */
      features: string[]
      /** @description The overrides in force now, limits first, each by key, with its end. The billing page marks these limits and features as the organization's agreement; the band's own values are in the catalogue. */
      overrides: components['schemas']['PlanOverride'][]
      /** @description What the org uses now of each limit the template counts, by key (users, its active members). A product's own limits are absent; the product counts them. */
      usage: {
        [key: string]: number
      }
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
     *     the organization's zone: scheduled switches and grace periods use
     *     it. A person's own zone is on their profile.
     * @example Asia/Kolkata
     */
    TimeZone: string
    NewOrganization: {
      name: string
      /** @description What people see in the product. Defaults to the name. */
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
        class: 'identity' | 'audit' | 'transient' | 'backups'
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
      /** @description The service whose part the last attempt could not gather. Pending, it is retried within the hour; after three attempts the export is failed. Absent once the export is made. */
      blocked_by?: string
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
    Onboarding: {
      /** Format: uuid */
      org_id: string
      /** @description The whole checklist is hidden for the organization. */
      dismissed: boolean
      /** @description Every step is done or dismissed, and none is unknown. */
      complete: boolean
      steps: components['schemas']['OnboardingStep'][]
    }
    OnboardingStep: {
      /** @description Stable; the core's are verify_domain, invite_teammates, set_up_sso and choose_plan, and a product adds its own. Not an enum. */
      id: string
      label: string
      /** @description Where the step is done, a path in app. */
      href: string
      /** @description The web app href is in, by name (admin unless the step says otherwise). */
      app: string
      /** @description Derived now from the organization's data. False when unknown. */
      done: boolean
      dismissed: boolean
      /** @description The service that knows did not answer in time; done is not known. */
      unknown: boolean
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
    StepId: string
    /**
     * @description A key the client makes up once per intended create and reuses on
     *     every retry of it. A second request with the same key returns what
     *     the first one made.
     */
    IdempotencyKey: string
    OrgId: string
    OverrideKind: 'limit' | 'feature'
    /** @description A registered limit's or feature's key, validated against the plan registry. */
    OverrideKey: string
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
  listPlans: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The catalogue */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PlanCatalogue']
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getOrganizationPlan: {
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
      /** @description The plan and the usage */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['OrganizationPlan']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
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
  listPlanOverrides: {
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
      /** @description The overrides, limits first, each by key */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PlanOverrideList']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setPlanOverride: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        kind: components['parameters']['OverrideKind']
        /** @description A registered limit's or feature's key, validated against the plan registry. */
        key: components['parameters']['OverrideKey']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['PlanOverrideInput']
      }
    }
    responses: {
      /** @description The override as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PlanOverride']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  removePlanOverride: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        kind: components['parameters']['OverrideKind']
        /** @description A registered limit's or feature's key, validated against the plan registry. */
        key: components['parameters']['OverrideKey']
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
  getOnboarding: {
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
      /** @description The checklist */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Onboarding']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  dismissOnboarding: {
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
      /** @description Hidden */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  restoreOnboarding: {
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
      /** @description Shown */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  dismissOnboardingStep: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        step_id: components['parameters']['StepId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Hidden */
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
  restoreOnboardingStep: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        step_id: components['parameters']['StepId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Shown */
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
}
