// Generated from specs/user.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/me': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The caller: their user and the membership their session carries */
    get: operations['getMe']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/me/profile': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    /**
     * Change the fields the person controls themselves
     * @description Display name, time zone and working hours, the same in every
     *     organization the person belongs to. Only the fields sent change;
     *     null clears one. The time zone must be an IANA name.
     */
    patch: operations['updateProfile']
    trace?: never
  }
  '/v1/me/photo': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Upload a profile photo
     * @description JPEG, PNG or WebP, at most five megabytes, as a `photo` part. The
     *     image is decoded, cropped to a square and stored at 512 pixels; the
     *     previous photo is deleted. The answer carries a signed link.
     */
    put: operations['setPhoto']
    post?: never
    /** Remove the profile photo */
    delete: operations['deletePhoto']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/leave': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * End the caller's own membership in this organization
     * @description Ends access to this organization's offices and sessions; the caller's
     *     other organizations are untouched. An Owner cannot leave: ownership is
     *     transferred first. Rejoining takes a fresh invite. Audited in the
     *     organization left.
     */
    post: operations['leaveOrganization']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/imports': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Invite many people at once from a spreadsheet
     * @description The users permission. A CSV or XLSX (first sheet, header row first,
     *     at most 5000 rows and 5 MB) as a `file` part, and optionally a
     *     `mapping` part: JSON naming the spreadsheet column for each field
     *     (`email`, `name`, `role`); without it the columns are found by
     *     those names. Every row is checked (missing fields, malformed
     *     address, duplicates within the sheet, already a member, an unknown
     *     role, the plan's user cap) and reported row by row. With
     *     `dry_run=true` nothing is sent; otherwise the valid rows are sent
     *     invites and the invalid ones reported. Nothing is silently dropped.
     *     Audited.
     */
    post: operations['importUsers']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/imports/columns': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * The columns of a spreadsheet, for mapping them before an import
     * @description The users permission. The same file the import takes, read and
     *     nothing else: its header row, how many people it holds, and the
     *     first few rows, so the admin can match columns to fields whatever
     *     the sheet calls them. Nothing is stored.
     */
    post: operations['readImportColumns']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/memberships': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One organization's memberships, a page at a time */
    get: operations['listMemberships']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/memberships/{membership_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One membership */
    get: operations['getMembership']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/memberships/{membership_id}/status': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Deactivate, suspend or reactivate one membership
     * @description Per membership: the person's other organizations are untouched.
     *     Until the roles story, a platform operator's action; an org's Admin
     *     then. Audited.
     */
    put: operations['setMembershipStatus']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/sign-ins': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * A person authenticated through an org's identity provider (identity service only)
     * @description Creates the user on first sight (by email) and the membership on
     *     first sign-in to this org, and refreshes the directory attributes
     *     every time. The org's identity provider is the gate: nobody is
     *     asked for an invite. Answers with every membership the person has,
     *     most recently active first, so the caller can decide where they land.
     */
    post: operations['recordSignIn']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/memberships': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * A membership from an invite, an import, the self-serve owner or a room invite (services only)
     * @description The other ways a membership comes to exist. The user is created by
     *     email if unknown; a second org inviting the same email gets a
     *     second membership, never a second account. Idempotent by key.
     */
    post: operations['createMembership']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/membership-by-email': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The membership an email address has in an organization, whatever its status (services only)
     * @description So an invite to someone already in can be refused with a reason.
     */
    get: operations['getMembershipByEmail']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/memberships/{membership_id}/activity': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * The person is active in this org now (identity service only)
     * @description Written when a session switches to this membership, so the org a
     *     person used last is the one their next sign-in lands in.
     */
    post: operations['recordMembershipActivity']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/memberships/{membership_id}/role': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Give a membership another org role (authorization service only)
     * @description The authorization service decides who may do this and refuses to
     *     demote the last Owner; this endpoint records the outcome. Audited by
     *     the caller.
     */
    put: operations['setMembershipRole']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/users/{user_id}/memberships': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** Every organization a person belongs to, most recently active first (services only) */
    get: operations['listUserMemberships']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/memberships/{membership_id}/presence': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Where the person is now, from the engine's identity adapter (realtime only)
     * @description Written as a person moves; read at the next sign-in or reload to
     *     put them back in the office and room they were in.
     */
    put: operations['setMembershipPresence']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/member-count': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** How many active members the org has, the number its plan caps (services only) */
    get: operations['countMembers']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/memberships/{membership_id}/card': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The name and photo presence shows for a membership (realtime only)
     * @description What the office draws beside a person: never taken from their own
     *     client, so nobody can appear as somebody else. The photo link is
     *     signed and expires; the realtime service asks again when a
     *     credential is refreshed.
     */
    get: operations['getMembershipCard']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/scim': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The org's SCIM setup, status and any halted change
     * @description Readable on every plan, so an org can see what SCIM does before
     *     upgrading; everything that changes it is Enterprise only. Needs the
     *     settings permission (an Owner or Admin).
     */
    get: operations['getScimSettings']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/scim/tokens': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * A new bearer token for the identity provider, shown once
     * @description Any earlier token keeps working for seven more days, so the provider
     *     can be switched to the new one without a gap; revoke ends one at
     *     once. Only a hash is kept. Not idempotent by key: the token cannot be
     *     shown a second time, and a retried call only makes a newer token.
     */
    post: operations['createScimToken']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/scim/tokens/{token_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /** End a token now */
    delete: operations['revokeScimToken']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/scim/groups': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The groups the provider has pushed, with the offices each feeds */
    get: operations['listScimGroups']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/scim/groups/{group_id}/offices': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * The offices a group feeds, replacing the list
     * @description Everyone in the group becomes an Office User of each office; an
     *     office taken off the list loses what the group granted (the page warns
     *     first). Saving resumes a mapping paused by a dismissed halt.
     */
    put: operations['setScimGroupOffices']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/scim/log': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The last hundred SCIM operations and reconciliation actions */
    get: operations['getScimLog']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/scim/halt': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Apply or dismiss the halted change
     * @description apply carries out what was held, as things stand now. dismiss leaves
     *     things as they are: a group's offices stop following it until the
     *     mapping is saved again, and the provider's word on the people it would
     *     have deactivated is forgotten until it speaks again.
     */
    post: operations['resolveScimHalt']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/me/deletion': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Ask for the caller's account to be deleted, after fourteen days
     * @description The person types DELETE to confirm. Their account and everything
     *     about them in every organization they belong to is deleted fourteen
     *     days from now, unless they sign in before then, which cancels it. An
     *     email says when. Refused while they are the last active Owner of any
     *     organization: ownership is transferred first. Asking again changes
     *     nothing and answers with the same date. Audited in every
     *     organization they belong to.
     */
    post: operations['requestAccountDeletion']
    /** Cancel the caller's pending account deletion */
    delete: operations['cancelAccountDeletion']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/platform/users/{user_id}/deletion': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Schedule a person's account for deletion (platform operators only)
     * @description The same fourteen days and the same email as the person asking
     *     themselves; signing in still cancels it. The reason is recorded in
     *     the audit log of every organization they belong to. Refused while
     *     they are the last active Owner of any organization.
     */
    post: operations['scheduleUserDeletion']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/users/{user_id}/signed-in': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * The person signed in (identity service only)
     * @description Called on every completed sign-in that did not come through an
     *     identity provider (those come through the sign-ins endpoint). A
     *     pending account deletion is cancelled.
     */
    post: operations['recordUserSignedIn']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/users/{user_id}/email': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /** Change a person's email once the new address is proven (identity service only) */
    put: operations['setUserEmail']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/user-by-email': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** Which person, if any, has an address (identity service only) */
    get: operations['findUserByEmail']
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
    /**
     * Delete everything this service keeps for an org, and count what is left (the organization service only)
     * @description The org's memberships and SCIM records go; so does every person who
     *     then belongs nowhere, with their photo and their sign-in account.
     */
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
    AccountDeletion: {
      /** Format: date-time */
      requested_at: string
      /**
       * Format: date-time
       * @description When the account is deleted unless the person signs in first.
       */
      deletion_after: string
    }
    ScimSettings: {
      /** @description Whether the org's plan has SCIM. */
      available: boolean
      /** @description Where the identity provider sends SCIM requests. */
      base_url: string
      tokens: components['schemas']['ScimToken'][]
      /** @description How many groups the provider has pushed. */
      groups: number
      /** Format: date-time */
      last_call_at?: string
      last_operation?: string
      halted?: components['schemas']['ScimHalt']
    }
    ScimToken: {
      /** Format: uuid */
      id: string
      prefix: string
      /** Format: date-time */
      created_at: string
      /** Format: date-time */
      last_used_at?: string
      /**
       * Format: date-time
       * @description Set once a newer token replaced this one.
       */
      expires_at?: string
    }
    NewScimToken: {
      /** Format: uuid */
      id: string
      /** @description The whole token. It is not shown again. */
      token: string
      prefix: string
      /** Format: date-time */
      created_at: string
    }
    ScimHalt: {
      /** Format: date-time */
      at: string
      reason: string
      changes: components['schemas']['ScimHaltedChange'][]
    }
    ScimHaltedChange: {
      /** @enum {string} */
      kind: 'group' | 'deactivate'
      /** Format: uuid */
      group_id?: string
      group_name?: string
      office_ids?: string[]
      /** @description Who would lose the offices, or be deactivated. */
      memberships: string[]
    }
    ScimGroupList: {
      groups: components['schemas']['ScimGroupSummary'][]
    }
    ScimGroupSummary: {
      /** Format: uuid */
      id: string
      display_name: string
      members: number
      offices: components['schemas']['ScimGroupOffice'][]
    }
    ScimGroupOffice: {
      /** Format: uuid */
      office_id: string
      /** @description Stopped by a dismissed halt until the mapping is saved again. */
      paused: boolean
    }
    ScimLog: {
      entries: components['schemas']['ScimLogEntry'][]
    }
    ScimLogEntry: {
      /** Format: uuid */
      id: string
      /** Format: date-time */
      at: string
      operation: string
      /** Format: uuid */
      membership_id?: string
      /** Format: uuid */
      group_id?: string
      /** @enum {string} */
      outcome: 'ok' | 'failed' | 'halted'
      error?: string
      details: {
        [key: string]: unknown
      }
    }
    /**
     * @description left is the person's own doing; a fresh invite brings them back.
     * @enum {string}
     */
    MembershipStatus: 'active' | 'deactivated' | 'suspended' | 'left'
    /**
     * @description member is an employee of the org; guest was invited into one room.
     * @enum {string}
     */
    MembershipKind: 'member' | 'guest'
    /**
     * @description How the membership came to exist.
     * @enum {string}
     */
    MembershipSource: 'idp' | 'invite' | 'import' | 'owner' | 'room_invite' | 'scim'
    /** @description What the org's identity provider says about the person. Every field optional. */
    Directory: {
      job_title?: string
      department?: string
      division?: string
      manager?: string
      employee_type?: string
      location?: string
      country?: string
      city?: string
      /** @description Custom attributes, as the provider sent them. */
      attributes?: {
        [key: string]: unknown
      }
    }
    User: {
      /** Format: uuid */
      id: string
      email: string
      name: string
      /** @description What people see under the avatar, when it differs from the name. */
      display_name?: string
      /** @description An IANA zone name the person chose; quiet hours, digests and stats weeks follow it. */
      time_zone?: string
      working_hours?: components['schemas']['WorkingHours']
      /** @description A signed link to the profile photo, good for an hour. Absent when there is none. */
      photo_url?: string
      preferences?: components['schemas']['Preferences']
      /** Format: date-time */
      created_at: string
    }
    ImportResult: {
      dry_run: boolean
      summary: {
        rows: number
        valid: number
        invalid: number
        /** @description Zero on a dry run. */
        invited: number
      }
      rows: components['schemas']['ImportRow'][]
    }
    ImportColumns: {
      /** @description The header row, in order. */
      columns: string[]
      /** @description People in the sheet, the header not counted. */
      rows: number
      /** @description The first few rows under the header. */
      sample: string[][]
    }
    ImportRow: {
      /** @description The row's number in the sheet, the header being 1. */
      row: number
      email?: string
      name?: string
      role?: string
      /** @enum {string} */
      status: 'invited' | 'would_invite' | 'failed'
      errors: {
        /**
         * @description missing_email, missing_name, email_invalid, name_too_long,
         *     role_invalid, duplicate, already_member, plan_limit,
         *     invite_failed.
         */
        code: string
        message: string
      }[]
    }
    /** @description When the person is normally at work, in their own time zone. */
    WorkingHours: {
      days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
      /**
       * @description HH:MM, twenty-four hour.
       * @example 09:00
       */
      start: string
      /**
       * @description HH:MM, after start.
       * @example 17:30
       */
      end: string
    }
    /** @description Appearance, stored on the user so it follows the person to every device. */
    Preferences: {
      /** @enum {string} */
      theme: 'light' | 'dark' | 'system'
      /** @description A BCP 47 tag, or null to follow the device. */
      language?: string | null
      hide_decorations: boolean
    }
    /** @description Only the fields sent change; null clears one. */
    ProfileUpdate: {
      /** @enum {string} */
      theme?: 'light' | 'dark' | 'system'
      language?: string | null
      hide_decorations?: boolean
      display_name?: string | null
      time_zone?: string | null
      working_hours?: components['schemas']['WorkingHours'] | null
    }
    Membership: {
      /** Format: uuid */
      id: string
      /** Format: uuid */
      org_id: string
      user: components['schemas']['User']
      kind: components['schemas']['MembershipKind']
      role: string
      status: components['schemas']['MembershipStatus']
      source: components['schemas']['MembershipSource']
      directory: components['schemas']['Directory']
      /** Format: uuid */
      last_office_id?: string
      last_room_id?: string
      /** Format: date-time */
      last_active_at?: string
      /** Format: date-time */
      deactivated_at?: string
      /** Format: date-time */
      created_at: string
      /** Format: date-time */
      last_modified_at: string
    }
    MembershipPage: {
      memberships: components['schemas']['Membership'][]
      next_cursor?: string
    }
    Me: {
      user: components['schemas']['User']
      membership?: components['schemas']['Membership']
      /**
       * Format: date-time
       * @description Set while the account is scheduled for deletion; signing in cancels it.
       */
      deletion_after?: string
    }
    SignIn: {
      /** Format: uuid */
      org_id: string
      email: string
      name: string
      /** @description The subject claim the org's identity provider issued. */
      idp_subject?: string
      directory?: components['schemas']['Directory']
    }
    SignInResult: {
      user: components['schemas']['User']
      membership: components['schemas']['Membership']
      /** @description Every membership the person has, most recently active first. */
      memberships: components['schemas']['Membership'][]
    }
    NewMembership: {
      /** Format: uuid */
      org_id: string
      email: string
      /** @description Used when the user does not exist yet; the email's local part otherwise. */
      name?: string
      kind?: components['schemas']['MembershipKind']
      /** @default user */
      role: string
      source: components['schemas']['MembershipSource']
    }
    Presence: {
      /** Format: uuid */
      office_id: string
      /** @description null when the person is in the office but no room. */
      room_id?: string | null
    }
    MembershipCard: {
      /** Format: uuid */
      user_id: string
      /** @description The name the person chose, else their account name. */
      display_name: string
      /** @description A signed link that expires. Absent when there is no photo. */
      photo_url?: string
      /** @description Someone from outside the org, on a room invite. */
      guest: boolean
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
    /** @description A key the caller makes up once per intended create and reuses on every retry of it. */
    IdempotencyKey: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  getMe: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The caller */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Me']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  updateProfile: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['ProfileUpdate']
      }
    }
    responses: {
      /** @description The user as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['User']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setPhoto: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'multipart/form-data': {
          /** Format: binary */
          photo: string
        }
      }
    }
    responses: {
      /** @description The user with the new photo */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['User']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The file is too large */
      413: {
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
  deletePhoto: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Removed, or there was none */
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
  leaveOrganization: {
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
      /** @description Left; how many organizations the person still belongs to */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** @description Active memberships left. Zero means the person is signed out to the no-organization screen; the account stays for a future invite. */
            remaining_memberships: number
          }
        }
      }
      401: components['responses']['Error']
      /** @description An Owner cannot leave; transfer ownership first */
      403: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  importUsers: {
    parameters: {
      query?: {
        dry_run?: boolean
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'multipart/form-data': {
          /** Format: binary */
          file: string
          /** @description JSON, such as {"email":"E-mail","name":"Full name","role":"Role"}. */
          mapping?: string
        }
      }
    }
    responses: {
      /** @description What was, or would be, done, row by row */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ImportResult']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The file is too large */
      413: {
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
  readImportColumns: {
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
        'multipart/form-data': {
          /** Format: binary */
          file: string
        }
      }
    }
    responses: {
      /** @description The sheet's shape */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ImportColumns']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The file is too large */
      413: {
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
  listMemberships: {
    parameters: {
      query?: {
        cursor?: string
        limit?: number
        /** @description The sort is stable across pages. By name A to Z, or newest first. */
        sort?: 'name' | 'created_at'
        order?: 'asc' | 'desc'
        /** @description Part of the name, or a prefix of the email. */
        q?: string
        department?: string
        role?: string
        status?: components['schemas']['MembershipStatus']
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
          'application/json': components['schemas']['MembershipPage']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getMembership: {
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
      /** @description The membership */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Membership']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setMembershipStatus: {
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
          status: components['schemas']['MembershipStatus']
        }
      }
    }
    responses: {
      /** @description The membership after the change */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Membership']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description The change would leave the organization without an active Owner */
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
  recordSignIn: {
    parameters: {
      query?: never
      header: {
        /** @description A key the caller makes up once per intended create and reuses on every retry of it. */
        'Idempotency-Key': components['parameters']['IdempotencyKey']
      }
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['SignIn']
      }
    }
    responses: {
      /** @description The user, this org's membership, and all their memberships */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['SignInResult']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The membership exists but is deactivated or suspended */
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
  createMembership: {
    parameters: {
      query?: never
      header: {
        /** @description A key the caller makes up once per intended create and reuses on every retry of it. */
        'Idempotency-Key': components['parameters']['IdempotencyKey']
      }
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewMembership']
      }
    }
    responses: {
      /** @description The membership, whether created now or found */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Membership']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getMembershipByEmail: {
    parameters: {
      query: {
        email: string
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The membership */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Membership']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  recordMembershipActivity: {
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
      /** @description Recorded */
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
  setMembershipRole: {
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
          role: string
        }
      }
    }
    responses: {
      /** @description The membership after the change */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Membership']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description The change would leave the organization without an active Owner */
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
  listUserMemberships: {
    parameters: {
      query?: never
      header?: never
      path: {
        user_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The memberships */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            memberships: components['schemas']['Membership'][]
          }
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setMembershipPresence: {
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
        'application/json': components['schemas']['Presence']
      }
    }
    responses: {
      /** @description Recorded */
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
  countMembers: {
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
      /** @description The count */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            active: number
          }
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getMembershipCard: {
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
      /** @description The card */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['MembershipCard']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getScimSettings: {
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
      /** @description The settings */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ScimSettings']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createScimToken: {
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
      /** @description The token, in full this once */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['NewScimToken']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  revokeScimToken: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        token_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Revoked */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listScimGroups: {
    parameters: {
      query?: {
        /** @description Only the groups that feed this office. */
        office_id?: string
      }
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
      }
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
          'application/json': components['schemas']['ScimGroupList']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setScimGroupOffices: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        group_id: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          office_ids: string[]
        }
      }
    }
    responses: {
      /** @description The group as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ScimGroupSummary']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getScimLog: {
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
          'application/json': components['schemas']['ScimLog']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  resolveScimHalt: {
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
          /** @enum {string} */
          action: 'apply' | 'dismiss'
        }
      }
    }
    responses: {
      /** @description The settings after */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ScimSettings']
        }
      }
      403: components['responses']['Error']
      409: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  requestAccountDeletion: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          /** @description Must be DELETE. */
          confirm: string
        }
      }
    }
    responses: {
      /** @description Scheduled */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AccountDeletion']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The caller is the last active Owner of the organizations named in fields */
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
  cancelAccountDeletion: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Cancelled, or there was nothing to cancel */
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
  scheduleUserDeletion: {
    parameters: {
      query?: never
      header?: never
      path: {
        user_id: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          reason: string
        }
      }
    }
    responses: {
      /** @description Scheduled */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AccountDeletion']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description The person is the last active Owner of the organizations named in fields */
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
  recordUserSignedIn: {
    parameters: {
      query?: never
      header?: never
      path: {
        user_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Recorded */
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
  setUserEmail: {
    parameters: {
      query?: never
      header?: never
      path: {
        user_id: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          email: string
        }
      }
    }
    responses: {
      /** @description The user as it now stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['User']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description Another person has that address */
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
  findUserByEmail: {
    parameters: {
      query: {
        email: string
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The person */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** Format: uuid */
            user_id: string
          }
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
