import { Avatar, Button, Card, Checkbox, Input, Select, Spinner, toast } from '@unityevolv/unitykit'
import type { identity, user } from '@b2b-template/api'
// The profile's rules are shared with the phone (UO-91).
import {
  DAYS,
  DIRECTORY_FIELDS,
  LANGUAGES,
  THEMES,
  timeZones,
  workingHours,
  type Day,
} from '@b2b-template/client'
import { useApp, useSession, useTheme, type ThemePreference } from '@b2b-template/ui-web'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AccountCards } from './AccountCards'
import { YourData } from './YourData'

type Me = user.components['schemas']['Me']
type Session = identity.components['schemas']['Session']

const message = (error: unknown) => (error as { message?: string } | undefined)?.message

/**
 * The person's own profile and appearance (UO-65): photo, display name,
 * time zone and working hours they control; the directory attributes their
 * organization's identity provider controls, shown read-only; appearance
 * stored on the user so it follows them; and where they are signed in.
 */
export default function ProfilePage() {
  const { t } = useTranslation('account')
  const { auth } = useApp()
  const { reload, signOut } = useSession()
  const { preference, setPreference } = useTheme()
  const [me, setMe] = useState<Me | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [timeZone, setTimeZone] = useState('')
  const [days, setDays] = useState<Day[]>([])
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:30')
  const [hoursError, setHoursError] = useState<string | undefined>()
  const photo = useRef<HTMLInputElement>(null)
  const api = auth?.api

  useEffect(() => {
    if (!api) return
    let current = true
    void Promise.all([api.user.GET('/v1/me'), api.identity.GET('/v1/sessions')]).then(([m, s]) => {
      if (!current || !m.data) return
      const u = m.data.user
      setMe(m.data)
      setSessions(s.data?.sessions ?? [])
      setDisplayName(u.display_name ?? '')
      setTimeZone(u.time_zone ?? '')
      setDays(u.working_hours?.days ?? [])
      if (u.working_hours) {
        setStart(u.working_hours.start)
        setEnd(u.working_hours.end)
      }
    })
    return () => {
      current = false
    }
  }, [api, version])

  if (!api || !me) return <Spinner block size="lg" label={t('profile.loading')} />
  const u = me.user
  const directory = me.membership?.directory ?? {}
  const shown = DIRECTORY_FIELDS.filter((f) => directory[f])
  const refresh = () => setVersion((v) => v + 1)

  const saveProfile = async () => {
    const hours = workingHours(days, start, end)
    if ('error' in hours) {
      setHoursError(t(`profile.${hours.error}`))
      return
    }
    setHoursError(undefined)
    setBusy(true)
    const { error } = await api.user.PATCH('/v1/me/profile', {
      body: {
        display_name: displayName.trim() || null,
        time_zone: timeZone || null,
        working_hours: hours.value,
      },
    })
    setBusy(false)
    if (error) {
      toast.error(message(error) ?? t('profile.saveFailed'))
      return
    }
    toast.success(t('profile.saved'))
    reload()
  }

  const uploadPhoto = async (file: File) => {
    const body = new FormData()
    body.append('photo', file)
    setBusy(true)
    const { error } = await api.user.PUT('/v1/me/photo', {
      body: body as never,
      bodySerializer: (b: unknown) => b as FormData,
    })
    setBusy(false)
    if (error) {
      toast.error(message(error) ?? t('profile.photoFailed'))
      return
    }
    refresh()
    reload()
  }

  const removePhoto = async () => {
    await api.user.DELETE('/v1/me/photo')
    refresh()
    reload()
  }

  const setLanguage = async (language: string) => {
    const { error } = await api.user.PATCH('/v1/me/profile', {
      body: { language: language || null },
    })
    if (error) toast.error(t('profile.saveFailed'))
    else {
      refresh()
      reload()
    }
  }

  const signOutOthers = async () => {
    const { error } = await api.identity.DELETE('/v1/sessions')
    if (error) {
      toast.error(t('profile.sessionsFailed'))
      return
    }
    toast.success(t('profile.othersSignedOut'))
    refresh()
  }

  const toggleDay = (day: Day, on: boolean) =>
    setDays((current) => (on ? [...current, day] : current.filter((d) => d !== day)))

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t('profile.title')}</h1>
      <div className="grid max-w-3xl gap-6">
        <Card header={t('profile.about')}>
          <div className="mb-4 flex items-center gap-4">
            <Avatar name={u.display_name || u.name} src={u.photo_url} size="lg" />
            <div className="flex flex-wrap gap-2">
              <input
                ref={photo}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label={t('profile.photo')}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadPhoto(file)
                  e.target.value = ''
                }}
              />
              <Button variant="secondary" disabled={busy} onClick={() => photo.current?.click()}>
                {t('profile.changePhoto')}
              </Button>
              {u.photo_url && (
                <Button variant="ghost" disabled={busy} onClick={() => void removePhoto()}>
                  {t('profile.removePhoto')}
                </Button>
              )}
            </div>
          </div>
          <p className="mb-4 text-sm">{t('profile.photoHelp')}</p>
          <div className="space-y-4">
            <Input label={t('profile.name')} value={u.name} readOnly help={t('profile.nameHelp')} />
            <Input label={t('profile.email')} value={u.email} readOnly />
            <Input
              label={t('profile.displayName')}
              value={displayName}
              maxLength={100}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Select
              label={t('profile.timeZone')}
              value={timeZone}
              placeholder={t('profile.timeZoneOrg')}
              onChange={(e) => setTimeZone(e.target.value)}
            >
              {timeZones().map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('profile.hours')}</legend>
              <div className="mb-2 flex flex-wrap gap-3">
                {DAYS.map((day) => (
                  <Checkbox
                    key={day}
                    label={t(`profile.days.${day}`)}
                    checked={days.includes(day)}
                    onChange={(e) => toggleDay(day, e.target.checked)}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <Input
                  type="time"
                  label={t('profile.start')}
                  value={start}
                  disabled={days.length === 0}
                  onChange={(e) => setStart(e.target.value)}
                />
                <Input
                  type="time"
                  label={t('profile.end')}
                  value={end}
                  disabled={days.length === 0}
                  error={hoursError}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </fieldset>
            <Button disabled={busy} onClick={() => void saveProfile()}>
              {t('profile.save')}
            </Button>
          </div>
        </Card>

        <Card header={t('profile.directory')}>
          {shown.length === 0 ? (
            <p className="text-sm">{t('profile.directoryEmpty')}</p>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {shown.map((field) => (
                <div key={field} className="contents">
                  <dt className="font-medium">{t(`profile.fields.${field}`)}</dt>
                  <dd>{directory[field]}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-4 text-sm">{t('profile.directoryHelp')}</p>
        </Card>

        <Card header={t('profile.appearance')}>
          <div className="space-y-4">
            <Select
              label={t('profile.theme')}
              value={preference}
              onChange={(e) =>
                void setPreference(e.target.value as ThemePreference).catch(() =>
                  toast.error(t('profile.saveFailed')),
                )
              }
            >
              {THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {t(`profile.themes.${theme}`)}
                </option>
              ))}
            </Select>
            <Select
              label={t('profile.language')}
              value={u.preferences?.language ?? ''}
              onChange={(e) => void setLanguage(e.target.value)}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {t(`profile.languages.${language || 'device'}`)}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card header={t('profile.sessions')}>
          <ul className="mb-4 space-y-2 text-sm">
            {sessions.map((s) => (
              <li key={s.session_id}>
                <span className="font-medium">{s.user_agent || t('profile.unknownDevice')}</span>
                <span>
                  {s.current
                    ? t('profile.thisDevice')
                    : t('profile.lastSeen', { when: new Date(s.last_seen_at).toLocaleString() })}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {sessions.length > 1 && (
              <Button variant="secondary" onClick={() => void signOutOthers()}>
                {t('profile.signOutOthers')}
              </Button>
            )}
            <Button variant="danger" onClick={() => void signOut()}>
              {t('profile.signOut')}
            </Button>
          </div>
        </Card>

        <YourData />
        <AccountCards
          email={u.email}
          deletionAfter={me.deletion_after}
          onChanged={() => setVersion((v) => v + 1)}
        />
      </div>
    </>
  )
}
