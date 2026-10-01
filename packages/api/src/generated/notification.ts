// Generated from specs/notification.yaml by packages/api/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend, and the sync brings it here.

export interface paths {
  '/v1/internal/emails': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Queue a templated email (services only) */
    post: operations['queueEmail']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/organizations/{org_id}/emails/{email_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One queued email's state (services only) */
    get: operations['getEmail']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/notifications': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The caller's feed, newest first, for the last 30 days */
    get: operations['listNotifications']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/notifications/read': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Mark entries read, the ones named or all of them, or those about one thing */
    post: operations['readNotifications']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/notification-preferences': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The caller's notification preferences, defaults filled in */
    get: operations['getNotificationPreferences']
    /** Change the caller's notification preferences */
    put: operations['setNotificationPreferences']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/notification-preferences/test': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** Send one test notification on a channel */
    post: operations['testNotification']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/notification-settings': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The org's defaults for new members, and whether push previews are allowed */
    get: operations['getOrgNotificationSettings']
    /** Change the org's defaults (Owner only) */
    put: operations['setOrgNotificationSettings']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/devices': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** This device gets pushes, for the caller's session */
    post: operations['registerDevice']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/devices/unregister': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /** This device stops getting pushes */
    post: operations['unregisterDevice']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/notification-categories': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * The registered notification categories, for the preferences pages to render
     * @description Every category registered in this deployment, the template's and the
     *     product's, in order, with its label, who it is for, where it goes by
     *     default and where it may go. The same for every org; any signed-in
     *     caller may read it.
     */
    get: operations['listNotificationCategories']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/push-config': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** What a browser subscribes to web push with */
    get: operations['getPushConfig']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/unsubscribe/{token}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * One-click unsubscribe from a category's email, or from the digest, from the link in it
     * @description No sign-in; the token is signed and names the person and the category, or `digest` for the daily digest, which it turns off for every category.
     */
    post: operations['unsubscribe']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/internal/events': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Something happened that people may be told about (services only)
     * @description The same intake as the Redis channel <prefix>:notify.
     */
    post: operations['emitEvent']
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
  '/v1/internal/organizations/{org_id}/memberships/{membership_id}/data': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    /** Delete what this service keeps personally under one membership, for account deletion (the organization and user services only) */
    delete: operations['forgetMembershipData']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
}
export type webhooks = Record<string, never>
export interface components {
  schemas: {
    NewEmail: {
      /** Format: uuid */
      org_id: string
      /** @description Shown in the template, so the recipient knows which org wrote. */
      org_name: string
      /** @description The recipient. Validated by the service, which names the field when it is wrong. */
      to: string
      /**
       * @description A template name from pkg/email.
       * @example notice
       */
      template: string
      /** @description The template's fields. */
      data?: {
        [key: string]: unknown
      }
    }
    Email: {
      /** Format: uuid */
      id: string
      /** Format: uuid */
      org_id: string
      template: string
      /** @enum {string} */
      state: 'queued' | 'sending' | 'sent' | 'failed' | 'suppressed' | 'bounced'
      attempts: number
      /** Format: date-time */
      next_attempt_at?: string
      /** Format: date-time */
      sent_at?: string
      last_error?: string
    }
    Error: {
      code: string
      message: string
      fields?: {
        [key: string]: string
      }
    }
    /** @description A registered notification category's id (GET /v1/notification-categories): security, membership, billing and admin_notices in the template, and whatever the product registers. Validated against the registry. */
    Category: string
    /** @enum {string} */
    Channel: 'in_app' | 'push' | 'email'
    ChannelChoice: {
      /** @description The in-app feed. */
      in_app: boolean
      push: boolean
      /** @description An email at once. */
      email: boolean
      /** @description A line in the daily digest email. */
      digest: boolean
    }
    NotificationCategory: {
      id: components['schemas']['Category']
      /** @description What the preferences grid calls it. */
      label: string
      description: string
      /**
       * @description Who it is for. An admin category's links open in the admin app.
       * @enum {string}
       */
      audience: 'member' | 'admin'
      default_channels: components['schemas']['ChannelChoice']
      /** @description The channels it may use at all; the grid offers only these, and a choice outside them is ignored. */
      channels: ('in_app' | 'push' | 'email' | 'digest')[]
      /** @description Whether quiet hours hold its push and email. */
      quiet_hours: boolean
      /** @description Whether events about the same thing within a few minutes are one entry and one push. */
      batched: boolean
    }
    NotificationCategoryList: {
      categories: components['schemas']['NotificationCategory'][]
    }
    FeedEntry: {
      /** Format: uuid */
      id: string
      category: components['schemas']['Category']
      kind: string
      /** @description The entry in words, as its push and email say it, from the category's copy for the kind and the entry's data (a batch's heading counts it). Never a preview. */
      heading: string
      /** @description The sentence under the heading, from the same copy. May be empty. */
      line: string
      /** @description What the entry is about, for the app to put into words. */
      data: {
        [key: string]: unknown
      }
      /** @description Where it opens, a path in the app. */
      link: string
      count: number
      /** @description A batch's individual items, newest first. */
      items: {
        [key: string]: unknown
      }[]
      /** Format: date-time */
      occurred_at: string
      read: boolean
    }
    FeedPage: {
      entries: components['schemas']['FeedEntry'][]
      unread: number
      next_cursor?: string
    }
    Unread: {
      unread: number
    }
    QuietHours: {
      enabled: boolean
      /** @description Minutes after midnight, in the person's time zone. */
      start_minute: number
      end_minute: number
      /** @description ISO weekdays, 1 Monday to 7 Sunday. */
      days: number[]
    }
    NotificationPreferences: {
      /** @description Category => channels. Every category, defaults filled in. */
      channels: {
        [key: string]: components['schemas']['ChannelChoice']
      }
      push_previews: boolean
      /** @description False when the org requires previews off; answers only. */
      previews_allowed?: boolean
      /** @description When the daily digest comes, in the person's time zone; null is the start of their working hours. */
      digest_minute?: number | null
      quiet_hours: components['schemas']['QuietHours']
      /** @description Conversations silenced from the conversation itself. */
      muted: string[]
    }
    OrgNotificationSettings: {
      channels: {
        [key: string]: components['schemas']['ChannelChoice']
      }
      previews_allowed: boolean
    }
    NewDevice: {
      /** @enum {string} */
      platform: 'web' | 'android' | 'ios'
      /** @description An FCM token, or for web the push subscription as JSON. */
      token: string
      app_version?: string
    }
    Device: {
      /** Format: uuid */
      id: string
      platform: string
    }
    Event: {
      /** @description The emitter's id for the event; the same id twice is one event. */
      id: string
      /** Format: uuid */
      org_id: string
      /** @description What happened within the category, such as new_sign_in or payment_failed; picks the category's words. */
      kind: string
      category: components['schemas']['Category']
      /** @description Memberships. Empty with an audience set, for the service to resolve. */
      recipients: string[]
      /**
       * @description Instead of recipients, everyone in the org holding that permission.
       * @enum {string}
       */
      audience?: 'admins' | 'billing'
      /**
       * Format: uuid
       * @description Who did it, who is never told about their own action.
       */
      actor?: string
      link: string
      /** @description What it is about, for batching and suppression, such as project:<id>. */
      group?: string
      data?: {
        [key: string]: unknown
      }
      /** @description Message text, shown only where the recipient allows previews. */
      preview?: string
      /** Format: date-time */
      expires_at?: string
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
    IdempotencyKey: string
    OrgId: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  queueEmail: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewEmail']
      }
    }
    responses: {
      /** @description Queued. Delivery happens from the outbox. */
      202: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Email']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getEmail: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        email_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The email */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Email']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listNotifications: {
    parameters: {
      query?: {
        category?: components['schemas']['Category']
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
      /** @description One page, and how many entries are unread */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['FeedPage']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  readNotifications: {
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
          ids?: string[]
          all?: boolean
          /** @description The thing opened, such as a conversation, as the entries group it. */
          about?: string
        }
      }
    }
    responses: {
      /** @description How many are unread now */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Unread']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getNotificationPreferences: {
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
      /** @description The preferences */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['NotificationPreferences']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setNotificationPreferences: {
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
        'application/json': components['schemas']['NotificationPreferences']
      }
    }
    responses: {
      /** @description The preferences */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['NotificationPreferences']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  testNotification: {
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
          channel: components['schemas']['Channel']
        }
      }
    }
    responses: {
      /** @description Sent, or queued */
      202: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** @description Devices a push went to; 1 for the feed or an email. */
            delivered: number
          }
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getOrgNotificationSettings: {
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
          'application/json': components['schemas']['OrgNotificationSettings']
        }
      }
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  setOrgNotificationSettings: {
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
        'application/json': components['schemas']['OrgNotificationSettings']
      }
    }
    responses: {
      /** @description The settings */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['OrgNotificationSettings']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  registerDevice: {
    parameters: {
      query?: never
      header: {
        'Idempotency-Key': components['parameters']['IdempotencyKey']
      }
      path: {
        org_id: components['parameters']['OrgId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewDevice']
      }
    }
    responses: {
      /** @description Registered */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Device']
        }
      }
      400: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  unregisterDevice: {
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
      /** @description Gone */
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
  listNotificationCategories: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The categories */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['NotificationCategoryList']
        }
      }
      401: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getPushConfig: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The public key */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            enabled: boolean
            vapid_public_key?: string
          }
        }
      }
      default: components['responses']['Error']
    }
  }
  unsubscribe: {
    parameters: {
      query?: never
      header?: never
      path: {
        token: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Unsubscribed */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            /** @description The category unsubscribed from, or digest. */
            category: string
          }
        }
      }
      400: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  emitEvent: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['Event']
      }
    }
    responses: {
      /** @description Taken */
      202: {
        headers: {
          [name: string]: unknown
        }
        content?: never
      }
      400: components['responses']['Error']
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
  forgetMembershipData: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        membership_id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Forgotten */
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
