import { describe, expect, it } from 'vitest'

import { bandLabel, planFeatures, planLimits, type PlanCatalogue } from './plans'

const catalogue: PlanCatalogue = {
  bands: [
    {
      name: 'free',
      label: 'Free',
      contractual: false,
      limits: { users: 5, projects: 3 },
      features: [],
    },
    {
      name: 'scale_up',
      label: 'Scale-up',
      contractual: false,
      limits: { users: 0, projects: 0 },
      features: ['gantt'],
    },
  ],
  limits: [
    { key: 'users', label: 'users' },
    { key: 'projects', label: 'projects' },
  ],
  features: [
    { key: 'scim', label: 'SCIM provisioning' },
    { key: 'gantt', label: 'Gantt charts' },
  ],
}

describe('the plan catalogue', () => {
  it('names a band by its label, else by its name', () => {
    expect(bandLabel(catalogue, 'scale_up')).toBe('Scale-up')
    expect(bandLabel(catalogue, 'retired_band')).toBe('Retired band')
    expect(bandLabel(null, 'team')).toBe('Team')
  })

  it('lists every limit in the catalogue’s order, with usage only where counted', () => {
    expect(
      planLimits(
        { limits: { projects: 0, users: 25, seats_extra: 2 }, usage: { users: 12 } },
        catalogue,
      ),
    ).toEqual([
      { key: 'users', label: 'users', cap: 25, used: 12 },
      { key: 'projects', label: 'projects', cap: 0 },
      { key: 'seats_extra', label: 'seats extra', cap: 2 },
    ])
  })

  it('lists the features a plan includes by their labels', () => {
    expect(planFeatures({ features: ['gantt', 'scim'] }, catalogue)).toEqual([
      { key: 'scim', label: 'SCIM provisioning' },
      { key: 'gantt', label: 'Gantt charts' },
    ])
    expect(planFeatures({ features: ['beta'] }, null)).toEqual([{ key: 'beta', label: 'beta' }])
  })
})
