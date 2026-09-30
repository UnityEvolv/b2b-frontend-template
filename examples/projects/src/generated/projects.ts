// Generated from specs/projects.yaml by examples/projects/scripts/generate.mjs. Never edit by hand:
// change the contract in the backend's examples/projects/api, and the sync brings it here.

export interface paths {
  '/v1/organizations/{org_id}/projects': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The organization's projects, newest first */
    get: operations['listProjects']
    put?: never
    /**
     * Create a project (the projects permission)
     * @description The Idempotency-Key header is required: a retried request with the
     *     same key returns the project the first one created and never makes a
     *     second, even at the plan's cap. The same key with a different name
     *     is refused (409, `request.idempotency_key_reused`). Over the plan's
     *     cap, 403 `plan.limit_reached` with `fields.plan`, `fields.limit`
     *     (`projects`) and, when a higher plan allows more, `fields.required_plan`.
     *     Audited as `project.created`.
     */
    post: operations['createProject']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/projects/{project_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** One project */
    get: operations['getProject']
    put?: never
    post?: never
    /**
     * Delete a project, its members and its cover (the projects permission)
     * @description Audited as `project.deleted`.
     */
    delete: operations['deleteProject']
    options?: never
    head?: never
    /**
     * Rename a project or change its description (the projects permission)
     * @description Fields left out are unchanged; an empty description clears it. Audited as `project.updated`.
     */
    patch: operations['updateProject']
    trace?: never
  }
  '/v1/organizations/{org_id}/projects/{project_id}/members': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /** The memberships a project is shared with, in the order they were added */
    get: operations['listProjectMembers']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/projects/{project_id}/members/{membership_id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    /**
     * Share a project with an active member of the organization (the projects permission)
     * @description Idempotent: sharing again answers with the member as it is. The first
     *     time, the member is told (the `project_shared` notification
     *     category), their open sessions get a `project.shared` live event, and
     *     it is audited as `project.member_added`. A membership that is not
     *     active in this organization is refused (400, `member.not_active`).
     */
    put: operations['addProjectMember']
    post?: never
    /**
     * Stop sharing a project with a member (the projects permission)
     * @description Removed, or was never a member. Audited as `project.member_removed` when there was one.
     */
    delete: operations['removeProjectMember']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/organizations/{org_id}/projects/{project_id}/cover': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Start uploading a new cover image (the projects permission)
     * @description JPEG, PNG or WebP, at most 2 MB (the `project-cover` storage
     *     purpose). The answer is a signed URL the browser PUTs the file to
     *     within ten minutes, with exactly the content type and size it
     *     declared here; the project already points at the new cover, and the
     *     previous one is deleted. Audited as `project.cover_set`.
     */
    post: operations['setProjectCover']
    /** Remove the cover image (the projects permission) */
    delete: operations['removeProjectCover']
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
    Project: {
      /** Format: uuid */
      id: string
      /** Format: uuid */
      org_id: string
      name: string
      /** @description Empty when there is none. */
      description: string
      member_count: number
      /** @description A signed link to the cover image, valid for an hour; absent when there is none. */
      cover_url?: string
      /** @description The actor, as membership:<uuid>; ids only. */
      created_by: string
      /** Format: date-time */
      created_at: string
      last_modified_by: string
      /** Format: date-time */
      last_modified_at: string
    }
    ProjectPage: {
      projects: components['schemas']['Project'][]
      next_cursor?: string
    }
    NewProject: {
      /** @description 1 to 200 characters. */
      name: string
      /** @description At most 2000 characters. */
      description?: string
    }
    ProjectChange: {
      /** @description 1 to 200 characters. */
      name?: string
      /** @description At most 2000 characters; empty clears it. */
      description?: string
    }
    ProjectMember: {
      /** Format: uuid */
      project_id: string
      /** Format: uuid */
      membership_id: string
      added_by: string
      /** Format: date-time */
      added_at: string
    }
    ProjectMemberList: {
      members: components['schemas']['ProjectMember'][]
    }
    NewCover: {
      /** @description image/jpeg, image/png or image/webp. */
      content_type: string
      /**
       * Format: int64
       * @description The file's size in bytes, at most 2 MB.
       */
      size: number
    }
    CoverUpload: {
      /** @description PUT the file here, with the declared Content-Type and Content-Length. */
      upload_url: string
      /** Format: date-time */
      expires_at: string
      project: components['schemas']['Project']
    }
    Error: {
      code: string
      message: string
      fields?: {
        [key: string]: string
      }
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
    /**
     * @description A key the client makes up once per intended create and reuses on
     *     every retry of it. A second request with the same key returns what
     *     the first one made.
     */
    IdempotencyKey: string
    OrgId: string
    ProjectId: string
    MembershipId: string
  }
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  listProjects: {
    parameters: {
      query?: {
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
      /** @description One page; next_cursor is absent on the last */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ProjectPage']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  createProject: {
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
        'application/json': components['schemas']['NewProject']
      }
    }
    responses: {
      /** @description The project, whether created now or by the first request with this key */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Project']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      409: components['responses']['Error']
      429: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  getProject: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The project */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Project']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  deleteProject: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Deleted */
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
  updateProject: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['ProjectChange']
      }
    }
    responses: {
      /** @description The project as it is now */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Project']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  listProjectMembers: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Every member; a project has at most 500 */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ProjectMemberList']
        }
      }
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  addProjectMember: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
        membership_id: components['parameters']['MembershipId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description The member */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ProjectMember']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  removeProjectMember: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
        membership_id: components['parameters']['MembershipId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Not a member now */
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
  setProjectCover: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['NewCover']
      }
    }
    responses: {
      /** @description Where to upload it, and the project pointing at it */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CoverUpload']
        }
      }
      400: components['responses']['Error']
      401: components['responses']['Error']
      403: components['responses']['Error']
      404: components['responses']['Error']
      default: components['responses']['Error']
    }
  }
  removeProjectCover: {
    parameters: {
      query?: never
      header?: never
      path: {
        org_id: components['parameters']['OrgId']
        project_id: components['parameters']['ProjectId']
      }
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
  forgetMembershipData: {
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
