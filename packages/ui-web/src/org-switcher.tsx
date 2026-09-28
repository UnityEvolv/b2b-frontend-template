import { Dropdown, toast } from '@unityevolv/unitykit'
import type { OrgChoice } from '@b2b-template/client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useApp } from './app'
import { useSession } from './session'

export type { OrgChoice } from '@b2b-template/client'

/**
 * Move between organizations without signing out (UO-99). Hidden when the
 * person has only one, which is the common case; otherwise it names the org
 * they are acting in and lists the others with their role in each.
 * Switching changes the session's active membership on the server and
 * reloads everything from it: navigation, permissions, offices. The platform
 * app has no switcher; staff are not org members.
 */
export function OrgSwitcher() {
  const { t } = useTranslation()
  const { app, auth, home } = useApp()
  const { state, reload } = useSession()
  const navigate = useNavigate()
  const [choices, setChoices] = useState<OrgChoice[]>([])
  const orgId = state.status === 'signed-in' ? state.session.membership?.orgId : undefined

  useEffect(() => {
    if (!auth || app === 'platform' || !orgId) return
    let current = true
    void auth.orgs.list().then(
      (list) => current && setChoices(list),
      () => current && setChoices([]),
    )
    return () => {
      current = false
    }
  }, [auth, app, orgId])

  if (!auth || choices.length < 2) return null
  const here = choices.find((c) => c.active)

  const choose = async (orgId: string) => {
    try {
      await auth.orgs.switchTo(orgId)
      // The office the person was in belongs to the org they left: the
      // reload drops it, and with it their presence there.
      navigate(home, { replace: true })
      reload()
    } catch {
      toast.error(t('orgs.switchFailed'))
    }
  }

  return (
    <Dropdown
      align="end"
      trigger={
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label={t('orgs.label', { name: here?.name ?? '' })}
        >
          {here?.name ?? t('orgs.choose')}
        </button>
      }
    >
      <Dropdown.Label>{t('orgs.heading')}</Dropdown.Label>
      {choices.map((choice) => (
        <Dropdown.Item
          key={choice.orgId}
          icon={choice.active ? 'check' : undefined}
          hint={t(`roles.${choice.role}` as never)}
          onSelect={() => (choice.active ? undefined : void choose(choice.orgId))}
        >
          {choice.name}
        </Dropdown.Item>
      ))}
    </Dropdown>
  )
}
