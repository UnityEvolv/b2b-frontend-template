// Generated from specs/identity.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/jwks': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The public keys platform tokens are signed with */
    get: operations['getJwks']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/start': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Begin sign-in through an organization's identity provider
     * @description Which organization: by id, or by the domain of the address the
     *     person typed. Redirects the browser to the provider. `next` is the
     *     path in the app to return to; `app` is which web app asked.
     *
     *     The desktop app and the mobile app open this in the
     *     system browser with `client=desktop` or `client=mobile` and a PKCE
     *     challenge of their own: the callback then
     *     starts no session in that browser, and instead sends the browser to
     *     the app's scheme with a one-time code the app exchanges at
     *     `POST /v1/sign-in/exchange`.
     */
    get: operations['startSignIn']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/methods': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * How an address signs in, before anyone has proven who they are
     * @description The sign-in page cannot know which organization someone belongs to
     *     before they say who they are, so it asks by address. A domain
     *     claimed by an organization with an identity provider signs in
     *     through it (`sso`, whatever the provider); anything else (a local organization or an
     *     unknown domain) signs in with a password (`local`). Nothing
     *     else is said: no organization's name or existence is revealed to
     *     someone who has not signed in. Rate limited by address.
     */
    get: operations['signInMethods']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/callback': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The identity provider sends the browser back here
     * @description Exchanges the code, validates the identity token, records the
     *     sign-in with the user service, starts a session, and redirects to
     *     the app. The session is a cookie on this host; the app then asks
     *     `POST /v1/session/refresh` for an access token. No token ever
     *     travels in a URL.
     */
    get: operations['finishSignIn']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/session/refresh': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * An access token for the session in the cookie
     * @description Rotates the refresh token. The access token carries the session's
     *     active membership; when the person has several organizations and
     *     none is active yet, `choose_organization` says the app must show
     *     the chooser and the token carries no organization.
     */
    post: operations['refreshSession']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/session/memberships': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The organizations the signed-in person may switch to */
    get: operations['listSessionMemberships']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/session/switch': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Make another of the person's organizations the active one
     * @description Switches the session's membership without another sign-in, and answers with a token for it.
     */
    post: operations['switchOrganization']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/session/sign-out': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** End the session in the cookie */
    post: operations['signOut']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/identity-provider': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The organization's identity provider, without its secret
     * @description Needs the sso permission, as changing it does.
     */
    get: operations['getIdentityProvider']
    /**
     * Configure the organization's identity provider
     * @description Any OpenID Connect provider, filled in from a preset. Nothing is
     *     saved unless the settings pass the same test as
     *     `POST .../identity-provider/test` (discovery, issuer, keys, and the
     *     client id and secret at the token endpoint); a failure is 422 with
     *     `fields` naming the inputs to fix. The client secret is encrypted
     *     under the organization's data key and never returned; left out on a
     *     change to the same provider and client id, the stored one is kept
     *     and tested again. Audited. Needs the
     *     sso permission (an Owner, an Admin with it, or a platform operator).
     */
    put: operations['setIdentityProvider']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/identity-provider/test': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Test identity provider settings without saving them
     * @description The round trip a save requires, reported check by check so the
     *     admin page can show what passed: the discovery document is
     *     fetched, its issuer matches, its signing keys load, and the token
     *     endpoint accepts the client id and secret (an authorization-code
     *     request with a code that cannot exist: a provider answers
     *     `invalid_client` for wrong credentials and `invalid_grant` for
     *     right ones). Nothing is stored. The same body as the PUT; the
     *     secret may be left out when one is saved. Needs the sso permission.
     */
    post: operations['testIdentityProvider']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/identity-provider-presets': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The presets a provider is filled in from
     * @description What each preset fills in, so the admin page's provider picker
     *     needs no copy of it: the issuer (with `{tenant_id}` where Entra's
     *     goes), the scopes, the claims, and which fields the preset asks for.
     */
    get: operations['listIdentityProviderPresets']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sessions': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The signed-in person's live sessions
     * @description Every browser and device the person is signed in on, most recently
     *     seen first, with the one making this request marked. Idle sessions
     *     are left out; they end on their next refresh.
     */
    get: operations['listSessions']
    put?: never
    post?: never
    /**
     * Sign out everywhere else
     * @description Ends every other session of the signed-in person and pushes the
     *     revocation to any open socket. The session making the request stays;
     *     `POST /v1/session/sign-out` ends that one. Audited.
     */
    delete: operations['revokeOtherSessions']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sessions/{session_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /**
     * End one of the signed-in person's sessions
     * @description Their own only: someone else's session is not found. Revoking the
     *     session making the request is allowed and is a sign-out. The
     *     revocation is pushed to any open socket. Audited.
     */
    delete: operations['revokeSession']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/session-policy': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * How long the organization's sessions last
     * @description The organization's own policy, or the platform's defaults when it has set none, with the range the platform allows.
     */
    get: operations['getSessionPolicy']
    /**
     * Change how long the organization's sessions last
     * @description Needs the settings permission (an Owner, or an Admin). Both values
     *     must be within the platform's range: an organization cannot make a
     *     session last forever. Applies to sessions started from now on;
     *     existing sessions keep the lifetime they were issued with. Audited.
     */
    put: operations['setSessionPolicy']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/users/{user_id}/sessions/revoke': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * End every session of a person (services only)
     * @description For a password change, an MFA reset, or a platform-wide deactivation:
     *     every live session ends, each revocation is pushed to any open
     *     socket, and each is audited in the organization that signed it in.
     */
    post: operations['revokeUserSessions']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/local-accounts': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Start a local account for a person (services only)
     * @description For an invite, a bulk import or a self-serve signup in an
     *     organization without an identity provider. The account starts
     *     unverified and cannot sign in; a verification link is emailed on the
     *     organization's behalf. Calling again for the same person sends a
     *     fresh link and retires the earlier ones; a verified address stays
     *     verified unless it changed.
     */
    post: operations['createLocalAccount']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/local-accounts/{user_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** A person's local account, if they have one (services only) */
    get: operations['getLocalAccount']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/email-verification/verify': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Prove ownership of an email address
     * @description The link in the email carries the token. One use; expired, used or
     *     unknown tokens are refused the same way. Verifying is what lets a
     *     local account sign in.
     */
    post: operations['verifyEmail']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/email-verification/resend': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Send the verification link again
     * @description Always answers 202: whether the address has an account, and whether
     *     it is already verified, is not something this endpoint tells. A
     *     person is sent at most a few links an hour; beyond that the request
     *     is accepted and nothing is sent. Rate limited by address on top.
     */
    post: operations['resendVerification']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/exchange': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * The desktop app takes up a sign-in finished in the system browser
     * @description The one-time code the callback sent to the app's scheme, with the
     *     PKCE verifier whose challenge started the attempt. Single use, and
     *     good for a minute. Starts the session in the app, sets the session
     *     cookie as local sign-in does, and answers with the access token.
     *     Anything wrong is refused alike, with `signin.exchange_invalid`.
     */
    post: operations['exchangeDesktopSignIn']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/local': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Sign in with email and password
     * @description For organizations without an identity provider. Starts a session and
     *     answers with the access token, as a refresh would; the session
     *     cookie is set. A wrong address and a
     *     wrong password are refused alike. Failed attempts are throttled per
     *     account and per address; a person who types their password right is
     *     never slowed. An unverified account is refused until its email is
     *     verified.
     */
    post: operations['signInLocal']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/mfa': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Finish a sign-in with a second factor
     * @description The challenge token from the local sign-in, and a code from the
     *     authenticator app or one of the recovery codes. Right: the session
     *     starts and the access token is answered, as the sign-in would have.
     *     Wrong: refused, counted against the account like a wrong password.
     *     The challenge lasts five minutes.
     */
    post: operations['signInMfa']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/mfa/enroll': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Set up an authenticator before the first sign-in that requires one
     * @description When the organization requires a second factor and the person has
     *     none, the local sign-in answers with an enrolment token instead of
     *     a session. This starts the enrolment with it, as `POST /v1/mfa/totp`
     *     does for a signed-in person; confirming with `POST /v1/mfa/totp/confirm`
     *     takes the same token in place of a bearer token. Then sign in again.
     */
    post: operations['enrollMfaAtSignIn']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/sign-in/mfa/confirm': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Confirm the authenticator set up before the first sign-in */
    post: operations['confirmMfaAtSignIn']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/mfa': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The signed-in person's second factor */
    get: operations['getMfa']
    put?: never
    post?: never
    /**
     * Turn off the signed-in person's second factor
     * @description Needs a current code from the app (or a recovery code). Refused
     *     when every organization the person belongs to requires a second
     *     factor. Audited.
     */
    delete: operations['disableMfa']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/mfa/totp': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Start setting up an authenticator app
     * @description A fresh secret, as the app takes it and as an otpauth link to show
     *     as a QR code. Not in force until confirmed with a code from the
     *     app. Starting again before confirming replaces the secret; an
     *     authenticator already confirmed is not replaced here.
     */
    post: operations['enrollTotp']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/mfa/totp/confirm': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Confirm the authenticator with a code from it
     * @description In force from here on. Answers with the recovery codes, shown once. Audited.
     */
    post: operations['confirmTotp']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/mfa/recovery-codes': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * A fresh set of recovery codes, replacing the old
     * @description Needs a current code from the app. Shown once. Audited.
     */
    post: operations['regenerateRecoveryCodes']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/members/{user_id}/sessions': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * A member's live sessions, for an admin
     * @description The users permission, for a member of the organization the caller manages (an Admin, Users and Guests only; 403 otherwise). The device and times, never an address.
     */
    get: operations['listMemberSessions']
    put?: never
    post?: never
    /**
     * Sign a member out everywhere, for an admin
     * @description The users permission, for a member of the organization the caller manages (an Admin, Users and Guests only; 403 otherwise). Every session ends and is pushed to their sockets. Audited.
     */
    delete: operations['revokeMemberSessions']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/members/{user_id}/mfa': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /**
     * Reset a member's second factor when they lose their device
     * @description The users permission in the organization, for a person who is a
     *     member of it and whom the caller manages (an Admin, Users and Guests
     *     only; 403 otherwise). Their authenticator and recovery codes are removed and
     *     every session of theirs ends; they set up a new one at their next
     *     sign-in (at once, if the organization requires it). Audited.
     */
    delete: operations['resetMemberMfa']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/local/password': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Set the password with a setup or reset link
     * @description The token is the one email verification answered with (a first
     *     password) or the one in a reset email. One use. The password must be
     *     at least twelve characters and not the email address. Setting it
     *     after a reset ends every session of the person. Audited.
     */
    post: operations['setPassword']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/local/password/forgot': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Send a password reset link
     * @description Always answers 202: whether the address has an account is not
     *     something this endpoint tells. A person is sent at most a few reset
     *     links an hour. The link works once and for one hour. Rate limited by
     *     address on top.
     */
    post: operations['forgotPassword']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/invites': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The organization's invites
     * @description Newest first, cursor paginated, by status. The users permission
     *     lists every invite; any member lists the ones they sent with
     *     `mine=true`, which is where an inviter extends or revokes them.
     */
    get: operations['listInvites']
    put?: never
    /**
     * Invite someone into the organization
     * @description The users permission, for a role the caller may manage (an Owner
     *     any, an Admin a User); a platform operator may invite the first
     *     Owner of a new organization. An address that already belongs to a
     *     member is refused with a reason. An open invite for the same
     *     address is sent again rather than duplicated. The link works once
     *     and for the expiry given, seven days by default. Emailed on the
     *     organization's behalf. Audited.
     */
    post: operations['createInvite']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/invites/{invite_id}/resend': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Send an open invite again, with a fresh link and expiry
     * @description The users permission for a role the caller may invite (an Admin, Users only; 403 otherwise), or the member who sent it. Audited.
     */
    post: operations['resendInvite']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/invites/{invite_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /**
     * Withdraw an open invite
     * @description The users permission for a role the caller may invite (an Admin, Users only; 403 otherwise), or the member who sent it. The link stops working. Audited.
     */
    delete: operations['revokeInvite']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/invites': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * An invite made by another service (services only)
     * @description Another service inviting someone into an organization. Same rules
     *     as the organization's own endpoint.
     */
    post: operations['createInternalInvite']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/invites/{token}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** What an invite link is for, before accepting it */
    get: operations['previewInvite']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/invites/{token}/accept': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Accept an invite
     * @description One use. The membership is made (the user too, on first sight, with
     *     the name given); a second organization inviting a known address
     *     gets a second membership, never a second account. Refused when the
     *     organization is at its plan's user cap, leaving the invite open. The answer says what comes next: sign in
     *     through the organization's identity provider, verify the email and
     *     set a password, or sign in with the password the person already has.
     */
    post: operations['acceptInvite']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/memberships/ended': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * A membership ended (services only)
     * @description The user service says so on deactivation, suspension or leaving.
     *     Every live session carrying that membership moves at once: to
     *     another of the person's organizations by the landing rule, to the
     *     chooser, or, when none remain, it is revoked. Either way the person's
     *     open connections in that organization are told and closed.
     */
    post: operations['membershipEnded']
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
    /**
     * Everything this service keeps for an org, for its export (the organization service only)
     * @description The identity provider's settings without the client secret, the
     *     session policy, and the invites without their tokens.
     */
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
     * @description The sign-in account without its password, the sessions on record,
     *     and whether a second factor is enrolled, without its secret.
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
  '/v1/internal/users/{user_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /**
     * Delete everything this service keeps about a person (the user and organization services only)
     * @description For a deleted account or a person whose last organization was
     *     purged: every session ends and is pushed, then the sign-in account,
     *     the second factor and any pending links are deleted. Idempotent.
     */
    delete: operations['deleteUserAccount']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/sessions/revoke': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * End every session working in an organization (the organization service only)
     * @description For an organization that is closing: every live session working in
     *     it ends, and each is pushed to any open socket, so nobody can reach
     *     it from the moment it closes. Signing in again is refused while it
     *     is closing.
     */
    post: operations['revokeOrgSessions']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/me/email': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Ask to sign in with another email address
     * @description A link goes to the new address; nothing changes until it is used,
     *     within 24 hours. Refused for a person whose address an identity
     *     provider manages (Entra or SCIM): they change it there. Only a
     *     local account has an address to change here. At most three links
     *     an hour.
     */
    post: operations['requestEmailChange']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/email-change/confirm': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Use the link sent to the new address
     * @description The address changes everywhere the person signs in. The old address
     *     is told, with a link that undoes the change within the hour. Works
     *     once.
     */
    post: operations['confirmEmailChange']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/email-change/undo': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Use the link sent to the old address, within the hour
     * @description The old address is restored and every session of the person ends,
     *     in case whoever changed it is signed in.
     */
    post: operations['undoEmailChange']
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
    EmailChangeToken: {
      token: string
    }
    EmailChanged: {
      /** @description The address the person signs in with now. */
      email: string
    }
    AccessToken: {
      access_token: string
      /** @enum {string} */
      token_type: 'Bearer'
      /** @description Seconds until the access token expires; refresh before then. */
      expires_in: number
      /** Format: uuid */
      user_id: string
      /** Format: uuid */
      org_id?: string
      /** Format: uuid */
      membership_id?: string
      /** @description True when no organization is active yet and the app must show the chooser. */
      choose_organization: boolean
    }
    SessionMembership: {
      /** Format: uuid */
      org_id: string
      /** Format: uuid */
      membership_id: string
      status: string
      role?: string
      /** @description The organization's name, for the switcher; the person is a member, so it is theirs to see. */
      org_name?: string
      /** @description Whether this is the session's active membership. */
      active: boolean
      /** Format: date-time */
      last_active_at?: string
    }
    Session: {
      /** Format: uuid */
      session_id: string
      /** @description The session making this request. */
      current: boolean
      /**
       * Format: uuid
       * @description The organization active in it, when one is.
       */
      org_id?: string
      /** @description The browser or device, as it described itself. */
      user_agent?: string
      /** Format: date-time */
      created_at: string
      /** Format: date-time */
      last_seen_at: string
      /**
       * Format: date-time
       * @description When it ends regardless of use.
       */
      expires_at: string
      /**
       * Format: date-time
       * @description When it ends if not used before then.
       */
      idle_expires_at?: string
    }
    SessionPolicy: {
      /** Format: uuid */
      org_id: string
      /** @description A session ends this long after sign-in regardless of use. */
      lifetime_seconds: number
      /** @description A session ends after this long without use. */
      idle_timeout_seconds: number
      /** @description Local accounts must have a second factor to sign in to this organization. Entra users get theirs from Microsoft. */
      mfa_required: boolean
      /** @description False while the organization is on the platform's defaults. */
      configured: boolean
      limits: {
        min_lifetime_seconds: number
        max_lifetime_seconds: number
        min_idle_timeout_seconds: number
        max_idle_timeout_seconds: number
      }
    }
    SessionPolicyUpdate: {
      lifetime_seconds: number
      idle_timeout_seconds: number
      /** @description Left out keeps what it is. */
      mfa_required?: boolean
    }
    NewInvite: {
      email: string
      /**
       * @description user, admin, billing_admin; owner only by a platform operator.
       * @default user
       */
      role: string
      /** @description Which web app the link opens, one of the configured apps; the main app (account, unless the deployment names others) when left out. */
      app?: string
      /** @default 168 */
      expires_in_hours: number
    }
    NewInternalInvite: {
      /** Format: uuid */
      org_id: string
      email: string
      /** @default user */
      role: string
      /** @description Which web app the link opens, one of the configured apps; the main app when left out. */
      app?: string
      /** @default 168 */
      expires_in_hours: number
      /**
       * Format: uuid
       * @description The member who asked, when one did.
       */
      invited_by_membership_id?: string
    }
    Invite: {
      /** Format: uuid */
      invite_id: string
      /** Format: uuid */
      org_id: string
      email: string
      role: string
      /** @enum {string} */
      status: 'pending' | 'accepted' | 'revoked' | 'expired'
      /** Format: date-time */
      expires_at: string
      /** Format: date-time */
      accepted_at?: string
      /** Format: date-time */
      revoked_at?: string
      /** Format: uuid */
      invited_by_membership_id?: string
      /** Format: date-time */
      created_at: string
    }
    InvitePage: {
      invites: components['schemas']['Invite'][]
      next_cursor?: string
    }
    InvitePreview: {
      /** Format: uuid */
      org_id: string
      org_name: string
      role: string
      /** Format: date-time */
      expires_at: string
      /** @description The address, partly hidden, so the person can tell which account it is for. */
      email_hint?: string
    }
    InviteAccepted: {
      /** Format: uuid */
      org_id: string
      /** Format: uuid */
      membership_id: string
      /** Format: uuid */
      user_id: string
      /**
       * @description sign_in_sso: the organization's identity provider signs the person in.
       *     verify_email: a verification link was sent; verify, then set a password.
       *     sign_in: the person already has a password; sign in with it.
       * @enum {string}
       */
      next: 'sign_in_sso' | 'verify_email' | 'sign_in'
    }
    MfaChallenge: {
      /**
       * @description challenge means a code is due; enroll means an authenticator must be set up first.
       * @enum {string}
       */
      mfa: 'challenge' | 'enroll'
      /** @description With mfa=challenge, what to send with the code. */
      challenge_token?: string
      /** @description With mfa=enroll, what the enrolment endpoints take in place of a bearer token. */
      enrollment_token?: string
      /** @description Seconds the token lasts. */
      expires_in?: number
    }
    TotpEnrolment: {
      /** @description Base32, for typing into the app by hand. */
      secret: string
      /** @description For showing as a QR code. */
      otpauth_uri: string
    }
    RecoveryCodes: {
      /** @description Each works once. Shown once; keep them somewhere safe. */
      recovery_codes: string[]
    }
    MfaStatus: {
      /** @description An authenticator is confirmed. */
      enrolled: boolean
      /** Format: date-time */
      confirmed_at?: string
      recovery_codes_left?: number
      /** @description The active organization requires a second factor. */
      required: boolean
    }
    LocalAccount: {
      /** Format: uuid */
      user_id: string
      email_verified: boolean
      /** Format: date-time */
      email_verified_at?: string
      /** @description With verified, when the account has no password yet: what POST /v1/local/password takes with the first one. One use, fifteen minutes. */
      setup_token?: string
    }
    /**
     * @description An OpenID Connect provider. The preset fills in what is left out:
     *     see `GET /v1/identity-provider-presets` and docs/sso.md.
     */
    NewIdentityProvider: {
      /** @description `entra`, `google` or `generic`; checked by the server. */
      preset: string
      /**
       * @description generic only (required there): the issuer URL, whose
       *     `/.well-known/openid-configuration` is the discovery document.
       *     https, except where the deployment allows plain http (a laptop).
       *     Left out for entra and google, whose issuer the preset derives.
       */
      issuer?: string
      /** @description entra only (required there): the tenant id (a GUID) or a verified domain. Not common, organizations or consumers. */
      tenant_id?: string
      /** @description google only (required there): the Workspace domain; identity tokens must carry it in hd. */
      hosted_domain?: string
      client_id: string
      /** @description Required the first time; left out on a change, the stored secret is kept, but only while the preset, issuer (tenant, hosted domain) and client id stay the same. */
      client_secret?: string
      /** @description The scopes asked for; must include openid. The preset's when left out. */
      scopes?: string[]
      /** @description The identity-token claim the address is read from. The preset's when left out. */
      email_claim?: string
      /** @description The claim the display name is read from. The preset's when left out. */
      name_claim?: string
      /**
       * @description Refuse a token that does not say email_verified=true. A token that
       *     says false is refused either way. The preset's when left out.
       */
      require_email_verified?: boolean
    }
    IdentityProvider: {
      /** Format: uuid */
      org_id: string
      /** @description `entra`, `google` or `generic`. */
      preset: string
      /** @description The issuer as its discovery document names it. */
      issuer: string
      /** @description entra only. */
      tenant_id?: string
      /** @description google only. */
      hosted_domain?: string
      client_id: string
      /** @description A secret is stored. The secret itself is never returned. */
      client_secret_set: boolean
      scopes: string[]
      email_claim: string
      name_claim: string
      require_email_verified: boolean
      /** @enum {string} */
      status: 'active' | 'disabled'
      /**
       * Format: date-time
       * @description When the settings last passed the test before saving.
       */
      verified_at?: string
      /** @description What to register with the provider as the redirect URI. */
      redirect_uri: string
    }
    IdentityProviderTest: {
      /** @description Every check passed; a save with these settings would be accepted. */
      ok: boolean
      /** @description The issuer the discovery document named, once it was fetched. */
      issuer?: string
      /** @description What to register with the provider as the redirect URI. */
      redirect_uri: string
      /** @description In order; a check after a failed one is not run and not listed. */
      checks: components['schemas']['IdentityProviderCheck'][]
    }
    IdentityProviderCheck: {
      /** @description `discovery`, `issuer`, `keys` or `client`. */
      check: string
      ok: boolean
      /** @description When it failed, the input to fix (issuer, tenant_id, client_id, client_secret). Absent when no input explains it, such as Google being unreachable. */
      field?: string
      /** @description A sentence for the admin. Never a secret or a token. */
      message: string
    }
    IdentityProviderPreset: {
      preset: string
      /** @description The issuer the preset uses: `{tenant_id}` stands for Entra's tenant; empty for generic, which asks for it. */
      issuer: string
      scopes: string[]
      email_claim: string
      name_claim: string
      require_email_verified: boolean
      /** @description The inputs the preset asks for besides the client id and secret. */
      fields: string[]
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
    InviteId: string
    InviteToken: string
    /** @description A retried create with the same key makes nothing new. */
    IdempotencyKey: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  getJwks: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description A JWK set */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            keys: {
              [key: string]: unknown
            }[]
          }
        }
      }
      default: components['responses']['Error']
    }
  }
  startSignIn: {
    parameters: {
      query?: {
        org_id?: string
        email?: string
        next?: string
        app?: string
        client?: 'web' | 'desktop' | 'mobile'
        /** @description The desktop app's PKCE challenge, base64url SHA-256 of its verifier. Required with client=desktop. */
        code_challenge?: string
        /** @description Only S256. */
        code_challenge_method?: 'S256'
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description To the identity provider */
      302: {
        headers: {
          Location?: string
          [name: string]: unknown
        }
        content?: never
      }
      400: components['responses']['Error']
      /** @description No organization for that domain, or the organization has no identity provider */
      404: {
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
  signInMethods: {
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
      /** @description The method */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** @enum {string} */
            method: 'sso' | 'local'
          }
        }
      }
      400: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  finishSignIn: {
    parameters: {
      query?: {
        code?: string
        state?: string
        error?: string
        error_description?: string
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description To the app, or to the app's sign-in page with an error code */
      302: {
        headers: {
          Location?: string
          [name: string]: unknown
        }
        content?: never
      }
      400: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  refreshSession: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The access token */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AccessToken']
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listSessionMemberships: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The memberships, most recently active first */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            memberships: components['schemas']['SessionMembership'][]
          }
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  switchOrganization: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          /** Format: uuid */
          org_id: string
        }
      }
    }
    responses: {
      /** @description The access token for the new active membership */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AccessToken']
        }
      }
      401: components['responses']['Error']
      /** @description The person has no active membership in that organization */
      403: {
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
  signOut: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Signed out; the cookie is cleared */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      default: components['responses']['Error']
    }
  }
  getIdentityProvider: {
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
      /** @description The provider */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['IdentityProvider']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setIdentityProvider: {
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
        'application/json': components['schemas']['NewIdentityProvider']
      }
    }
    responses: {
      /** @description The provider, tested and saved */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['IdentityProvider']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /**
       * @description The settings failed the test: `identity_provider.test_failed`,
       *     with `fields` naming each input to fix.
       */
      422: {
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
  testIdentityProvider: {
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
        'application/json': components['schemas']['NewIdentityProvider']
      }
    }
    responses: {
      /** @description The report; `ok` is whether a save would be accepted */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['IdentityProviderTest']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listIdentityProviderPresets: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The presets */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            presets: components['schemas']['IdentityProviderPreset'][]
          }
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listSessions: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The sessions */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            sessions: components['schemas']['Session'][]
          }
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  revokeOtherSessions: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description How many sessions ended */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            revoked: number
          }
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  revokeSession: {
    parameters: {
      query?: never
      header?: never
      path: {
        session_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Ended */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      401: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getSessionPolicy: {
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
      /** @description The policy */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['SessionPolicy']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setSessionPolicy: {
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
        'application/json': components['schemas']['SessionPolicyUpdate']
      }
    }
    responses: {
      /** @description The policy as saved */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['SessionPolicy']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  revokeUserSessions: {
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
          /** @description A stable code for why, for the audit log and the person's screen. */
          reason: string
        }
      }
    }
    responses: {
      /** @description How many sessions ended */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            revoked: number
          }
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createLocalAccount: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          /** Format: uuid */
          user_id: string
          email: string
          /** Format: uuid */
          org_id: string
          org_name: string
          /** @description Which web app the link opens, one of the configured apps (account, admin and platform unless the deployment names others). */
          app: string
          /**
           * @description The caller has already proven the address (a self-serve
           *     signup): no link is sent, the account starts verified,
           *     and the answer carries a setup token for the first
           *     password.
           * @default false
           */
          verified?: boolean
        }
      }
    }
    responses: {
      /** @description The account as it stands */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['LocalAccount']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getLocalAccount: {
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
      /** @description The account */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['LocalAccount']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  verifyEmail: {
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
      /** @description Verified */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** Format: uuid */
            user_id: string
            /**
             * Format: uuid
             * @description The organization the link was sent for; the app continues there.
             */
            org_id: string
            /**
             * @description Present when the account has no password yet: the app
             *     sends it with the first password to `POST /v1/local/password`.
             *     One use, fifteen minutes.
             */
            setup_token?: string
          }
        }
      }
      /** @description The link is not valid any more */
      400: {
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
  resendVerification: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          email: string
          /** @description One of the configured web apps (account, admin and platform unless the deployment names others). */
          app: string
        }
      }
    }
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      400: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  exchangeDesktopSignIn: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          code: string
          code_verifier: string
        }
      }
    }
    responses: {
      /** @description Signed in */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AccessToken']
        }
      }
      400: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  signInLocal: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          email: string
          password: string
          /** @description One of the configured web apps; the main app (account, unless the deployment names others) when left out. */
          app?: string
        }
      }
    }
    responses: {
      /** @description Signed in */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AccessToken']
        }
      }
      /** @description The password is right and a second factor is due, or must be set up first */
      202: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['MfaChallenge']
        }
      }
      400: components['responses']['Error']
      /** @description Refused; the code says whether it was the credentials, an unverified email, or no organization */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      /** @description Too many failed attempts for this account or address; try later */
      429: {
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
  signInMfa: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          challenge_token: string
          code: string
        }
      }
    }
    responses: {
      /** @description Signed in */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AccessToken']
        }
      }
      400: components['responses']['Error']
      /** @description The code is wrong, or the challenge has expired */
      401: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      /** @description Too many wrong codes; try later */
      429: {
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
  enrollMfaAtSignIn: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          enrollment_token: string
        }
      }
    }
    responses: {
      /** @description The secret to put in the app */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['TotpEnrolment']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  confirmMfaAtSignIn: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          enrollment_token: string
          code: string
        }
      }
    }
    responses: {
      /** @description Enrolled; the recovery codes, shown once */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['RecoveryCodes']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getMfa: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The state */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['MfaStatus']
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  disableMfa: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          code: string
        }
      }
    }
    responses: {
      /** @description Off */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      401: components['responses']['Error']
      /** @description The code is wrong, or an organization requires it */
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
  enrollTotp: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The secret to put in the app */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['TotpEnrolment']
        }
      }
      401: components['responses']['Error']
      /** @description An authenticator is already confirmed; turn it off first */
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
  confirmTotp: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          code: string
        }
      }
    }
    responses: {
      /** @description Enrolled; the recovery codes */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['RecoveryCodes']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      /** @description Nothing to confirm; start with `POST /v1/mfa/totp` */
      404: {
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
  regenerateRecoveryCodes: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          code: string
        }
      }
    }
    responses: {
      /** @description The new codes */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['RecoveryCodes']
        }
      }
      401: components['responses']['Error']
      /** @description The code is wrong */
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
  listMemberSessions: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        user_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The sessions */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            sessions: components['schemas']['Session'][]
          }
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  revokeMemberSessions: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        user_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description How many sessions ended */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            revoked: number
          }
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  resetMemberMfa: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        user_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Reset */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description Not a member, or no second factor to reset */
      404: {
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
  setPassword: {
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
          password: string
        }
      }
    }
    responses: {
      /** @description Set; sign in with it */
      204: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      /** @description The link is not valid any more, or the password does not meet the policy */
      400: {
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
  forgotPassword: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          email: string
          /** @description One of the configured web apps (account, admin and platform unless the deployment names others). */
          app: string
        }
      }
    }
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      400: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listInvites: {
    parameters: {
      query?: {
        status?: 'pending' | 'accepted' | 'revoked' | 'expired'
        mine?: boolean
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
      /** @description A page */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['InvitePage']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createInvite: {
    parameters: {
      query?: never
      header?: {
        /** @description A retried create with the same key makes nothing new. */
        'Idempotency-Key'?: components['parameters']['IdempotencyKey']
      }
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewInvite']
      }
    }
    responses: {
      /** @description The invite */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Invite']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The address already belongs to a member of the organization */
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
  resendInvite: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        invite_id: components['parameters']['InviteId']
      }
      cookie?: never
    }
    requestBody?: {
      content: {
        'application/json': {
          expires_in_hours?: number
        }
      }
    }
    responses: {
      /** @description The invite, reissued */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Invite']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      /** @description The invite is no longer open */
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
  revokeInvite: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        invite_id: components['parameters']['InviteId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Withdrawn */
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
  createInternalInvite: {
    parameters: {
      query?: never
      header?: {
        /** @description A retried create with the same key makes nothing new. */
        'Idempotency-Key'?: components['parameters']['IdempotencyKey']
      }
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewInternalInvite']
      }
    }
    responses: {
      /** @description The invite */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Invite']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      /** @description The address already belongs to a member of the organization */
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
  previewInvite: {
    parameters: {
      query?: never
      header?: never
      path: {
        token: components['parameters']['InviteToken']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The invite, as the acceptance page shows it */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['InvitePreview']
        }
      }
      /** @description Not an open invite; the code says whether it was used, withdrawn or has expired */
      404: {
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
  acceptInvite: {
    parameters: {
      query?: never
      header?: never
      path: {
        token: components['parameters']['InviteToken']
      }
      cookie?: never
    }
    requestBody?: {
      content: {
        'application/json': {
          /** @description The person's name, used when they are new. */
          name?: string
        }
      }
    }
    responses: {
      /** @description Accepted */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['InviteAccepted']
        }
      }
      400: components['responses']['Error']
      /** @description Not an open invite */
      404: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      /** @description The organization is at its plan's user cap; the invite stays open */
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
  membershipEnded: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          /** Format: uuid */
          org_id: string
          /** Format: uuid */
          membership_id: string
          /** Format: uuid */
          user_id: string
          /** @enum {string} */
          reason: 'deactivated' | 'suspended' | 'left' | 'account_deleted'
        }
      }
    }
    responses: {
      /** @description What happened to the sessions */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** @description Sessions moved to another organization or the chooser. */
            switched: number
            /** @description Sessions ended because no organization remained. */
            revoked: number
          }
        }
      }
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
  deleteUserAccount: {
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
      /** @description Deleted, or there was nothing */
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
  revokeOrgSessions: {
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
          reason: 'organization_closing'
        }
      }
    }
    responses: {
      /** @description How many sessions ended */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            revoked: number
          }
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  requestEmailChange: {
    parameters: {
      query?: never
      header?: never
      path?: never
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
      /** @description The link is on its way to the new address */
      202: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      /** @description The address is managed by an identity provider, there is no local account, or the address is taken */
      409: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Error']
        }
      }
      /** @description Too many links this hour */
      429: {
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
  confirmEmailChange: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['EmailChangeToken']
      }
    }
    responses: {
      /** @description Changed */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EmailChanged']
        }
      }
      400: components['responses']['Error']
      /** @description Somebody else signs in with that address now */
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
  undoEmailChange: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['EmailChangeToken']
      }
    }
    responses: {
      /** @description Undone */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EmailChanged']
        }
      }
      400: components['responses']['Error']
      /** @description Somebody else signs in with the old address now */
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
}
