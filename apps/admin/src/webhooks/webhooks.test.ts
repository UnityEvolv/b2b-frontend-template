import { describe, expect, it } from 'vitest'

import { endpointRequest, outcome, overlapHours, refusal } from './webhooks'

describe('an endpoint’s request', () => {
  it('needs a URL, and sends the rest as typed, no types meaning every type', () => {
    expect(
      endpointRequest({ url: '  ', description: '', eventTypes: [], enabled: true }),
    ).toBeNull()
    expect(
      endpointRequest({
        url: ' https://hooks.example.test/in ',
        description: ' CRM ',
        eventTypes: [],
        enabled: false,
      }),
    ).toEqual({
      url: 'https://hooks.example.test/in',
      description: 'CRM',
      event_types: [],
      enabled: false,
    })
  })
})

describe('the rotation overlap', () => {
  it('is whole hours from 0 to 168', () => {
    expect(overlapHours('0')).toBe(0)
    expect(overlapHours(' 24 ')).toBe(24)
    expect(overlapHours('168')).toBe(168)
    expect(overlapHours('169')).toBeNull()
    expect(overlapHours('-1')).toBeNull()
    expect(overlapHours('1.5')).toBeNull()
    expect(overlapHours('')).toBeNull()
  })
})

describe('a refusal', () => {
  it('tells the plan, the endpoint cap, bad fields and anything else apart', () => {
    expect(
      refusal({
        code: 'plan.limit_reached',
        message: 'x',
        fields: { plan: 'free', limit: 'webhooks', required_plan: 'team' },
      }),
    ).toEqual({ kind: 'plan', requiredPlan: 'team' })
    expect(refusal({ code: 'plan.limit_reached', message: 'x' })).toEqual({ kind: 'plan' })
    expect(refusal({ code: 'webhooks.endpoint_limit', message: 'x' })).toEqual({ kind: 'limit' })
    expect(
      refusal({
        code: 'invalid_request',
        message: 'Some fields are not valid.',
        fields: { url: 'https only', other: 'ignored' },
      }),
    ).toEqual({ kind: 'fields', fields: { url: 'https only' } })
    expect(refusal({ code: 'authz.forbidden', message: 'No.' })).toEqual({
      kind: 'other',
      message: 'No.',
    })
    expect(refusal(undefined)).toEqual({ kind: 'other' })
  })
})

describe('an attempt’s outcome', () => {
  it('is the status code, else the reason there was none', () => {
    expect(outcome({ last_status_code: 503, last_error: 'The endpoint answered 503.' })).toEqual({
      code: 503,
    })
    expect(outcome({ last_error: 'The endpoint did not answer in time.' })).toEqual({
      error: 'The endpoint did not answer in time.',
    })
    expect(outcome({})).toBeNull()
  })
})
