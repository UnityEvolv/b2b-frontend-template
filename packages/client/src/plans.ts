import type { Api, organization } from '@b2b-template/api'
import { humanizeKey } from '@b2b-template/core'
import { useCallback, useEffect, useState } from 'react'

type Schemas = organization.components['schemas']
export type PlanCatalogue = Schemas['PlanCatalogue']
export type PlanBand = Schemas['PlanBand']
export type OrganizationPlan = Schemas['OrganizationPlan']

/** One limit of a plan as a page lists it: its label, its cap and, when counted, the usage. */
export interface PlanLimitRow {
  key: string
  label: string
  /** 0 means no cap. */
  cap: number
  /** Absent for a limit the template does not count (a product's own). */
  used?: number
}

/**
 * The plan catalogue the deployment registers, the template's bands, limits
 * and features and the product's, with their labels: read from the
 * organization service each time a page opens, never listed or kept here.
 * Null while loading; empty when the read failed.
 */
export function usePlanCatalogue(api: Api | undefined): PlanCatalogue | null {
  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null)
  useEffect(() => {
    if (!api) return
    let current = true
    void api.organization
      .GET('/v1/plans')
      .then(({ data }) => current && setCatalogue(data ?? { bands: [], limits: [], features: [] }))
    return () => {
      current = false
    }
  }, [api])
  return catalogue
}

/**
 * The org's plan, what it allows and what the org uses now, read when the
 * page opens and again on reload (after a change), never kept between them.
 */
export function useOrganizationPlan(api: Api | undefined, orgId: string | undefined) {
  const [plan, setPlan] = useState<OrganizationPlan | null>(null)
  const [failed, setFailed] = useState(false)
  const reload = useCallback(async () => {
    if (!api || !orgId) return
    const { data } = await api.organization.GET('/v1/organizations/{org_id}/plan', {
      params: { path: { org_id: orgId } },
    })
    setPlan(data ?? null)
    setFailed(!data)
  }, [api, orgId])
  useEffect(() => {
    const first = setTimeout(() => void reload(), 0)
    return () => clearTimeout(first)
  }, [reload])
  return { plan, failed, reload }
}

/** What a page calls a band: the catalogue's label, else its name humanized. */
export function bandLabel(catalogue: PlanCatalogue | null, band: string): string {
  return catalogue?.bands.find((b) => b.name === band)?.label || humanizeKey(band)
}

/** A label as a list item starts it: "users" is "Users". */
export function sentenceCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Every limit of a plan, in the catalogue's order, with the catalogue's label,
 * the cap and the usage the plan read answers with. A limit the plan caps that
 * the catalogue does not name still shows, by its key.
 */
export function planLimits(
  plan: Pick<OrganizationPlan, 'limits'> & { usage?: OrganizationPlan['usage'] },
  catalogue: PlanCatalogue | null,
): PlanLimitRow[] {
  const known = catalogue?.limits ?? []
  const keys = [
    ...known.map((l) => l.key).filter((k) => k in plan.limits),
    ...Object.keys(plan.limits).filter((k) => !known.some((l) => l.key === k)),
  ]
  return keys.map((key) => {
    const used = plan.usage?.[key]
    return {
      key,
      label: known.find((l) => l.key === key)?.label || humanizeKey(key).toLowerCase(),
      cap: plan.limits[key] ?? 0,
      ...(used === undefined ? {} : { used }),
    }
  })
}

/** The gated features a plan includes, with the catalogue's labels, in its order. */
export function planFeatures(
  plan: Pick<OrganizationPlan, 'features'>,
  catalogue: PlanCatalogue | null,
): { key: string; label: string }[] {
  const known = catalogue?.features ?? []
  const keys = [
    ...known.map((f) => f.key).filter((k) => plan.features.includes(k)),
    ...plan.features.filter((k) => !known.some((f) => f.key === k)),
  ]
  return keys.map((key) => ({
    key,
    label: known.find((f) => f.key === key)?.label || humanizeKey(key).toLowerCase(),
  }))
}
