import type { user } from '@b2b-template/api'

export type ScimSettings = user.components['schemas']['ScimSettings']
export type ScimGroup = user.components['schemas']['ScimGroupSummary']
export type ScimLogEntry = user.components['schemas']['ScimLogEntry']

/** The providers a setup guide is written for, in the order shown. */
export const PROVIDERS = ['entra', 'okta', 'google'] as const
export type Provider = (typeof PROVIDERS)[number]

/** Each guide's steps, as keys into the admin strings. */
export const GUIDE_STEPS = {
  entra: [
    'scim.guide.entra.step1',
    'scim.guide.entra.step2',
    'scim.guide.entra.step3',
    'scim.guide.entra.step4',
    'scim.guide.entra.step5',
    'scim.guide.entra.step6',
  ],
  okta: [
    'scim.guide.okta.step1',
    'scim.guide.okta.step2',
    'scim.guide.okta.step3',
    'scim.guide.okta.step4',
    'scim.guide.okta.step5',
  ],
  google: [
    'scim.guide.google.step1',
    'scim.guide.google.step2',
    'scim.guide.google.step3',
    'scim.guide.google.step4',
    'scim.guide.google.step5',
  ],
} as const satisfies Record<Provider, readonly string[]>

/** Where SCIM does its audit trail: every change it makes has this actor. */
export const SCIM_ACTOR = 'system:scim'

/**
 * The URL a provider is given. The API gives an absolute one wherever the
 * base hostname is configured; on a laptop it is relative to the user
 * service.
 */
export function scimURL(base: string, userOrigin: string | undefined): string {
  if (/^https?:\/\//.test(base) || !userOrigin) return base
  return userOrigin.replace(/\/+$/, '') + base
}
