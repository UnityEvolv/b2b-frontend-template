import type { user } from '@b2b-template/api'
import {
  DAYS,
  deviceTimeZone,
  DIRECTORY_FIELDS,
  matchTimeZones,
  THEMES,
  timeZones,
  useSession,
  workingHours,
  type Day,
} from '@b2b-template/client'
import { isValidTimeZone } from '@b2b-template/core'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, View } from 'react-native'

import { NS } from '../i18n'
import { apiMessage } from '../org'
import {
  cameraPermission,
  filePart,
  pickPhoto,
  PHOTO_MAX_BYTES,
  type PhotoSource,
} from '../platform/photo'
import { requireAuth } from '../services'
import { Avatar, Banner, Body, Button, Chip, Field, Loading, Row, Screen, Section } from '../ui'

type Me = user.components['schemas']['Me']

/**
 * The person's profile on the phone: a photo from the camera or the
 * gallery, display name, time zone and working hours, and the directory
 * attributes their organization controls, read-only. The same rules as web,
 * from the same code; the API checks them again.
 */
export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const api = auth.api
  const { reload, savePreferences, state } = useSession()
  const [me, setMe] = useState<Me | null>(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [timeZone, setTimeZone] = useState('')
  const [zoneQuery, setZoneQuery] = useState('')
  const [days, setDays] = useState<Day[]>([])
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:30')
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger' | 'info'; text: string } | null>(
    null,
  )
  const [hoursError, setHoursError] = useState<string | null>(null)
  const [zoneError, setZoneError] = useState<string | null>(null)
  // Before the camera is asked for the first time, the app says why.
  const [explainCamera, setExplainCamera] = useState(false)
  const [denied, setDenied] = useState<{ source: PhotoSource; settings: boolean } | null>(null)
  const zones = useMemo(() => timeZones(), [])
  const listable = zones.length > 1

  useEffect(() => {
    let current = true
    void api.user.GET('/v1/me').then(({ data }) => {
      if (!current || !data) return
      const u = data.user
      setMe(data)
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

  if (!me) return <Loading label={t('account:profile.loading')} />
  const u = me.user
  const directory = me.membership?.directory ?? {}
  const shown = DIRECTORY_FIELDS.filter((f) => directory[f])
  const preference = state.status === 'signed-in' ? state.session.user.preferences.theme : 'system'

  const save = async () => {
    const hours = workingHours(days, start, end)
    if ('error' in hours) {
      setHoursError(t(`account:profile.${hours.error}`))
      return
    }
    if (timeZone && !isValidTimeZone(timeZone)) {
      setZoneError(t('mobile:profile.zoneInvalid'))
      return
    }
    setHoursError(null)
    setZoneError(null)
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
      setMessage({ tone: 'danger', text: apiMessage(error) ?? t('account:profile.saveFailed') })
      return
    }
    setMessage({ tone: 'ok', text: t('account:profile.saved') })
    reload()
  }

  const choosePhoto = async (source: PhotoSource) => {
    setDenied(null)
    setMessage(null)
    if (source === 'camera' && !explainCamera && (await cameraPermission()) === 'ask') {
      setExplainCamera(true)
      return
    }
    setExplainCamera(false)
    const outcome = await pickPhoto(source)
    if (outcome.kind === 'cancelled') return
    if (outcome.kind === 'denied') {
      setDenied({ source: outcome.source, settings: outcome.settings })
      return
    }
    if (outcome.photo.size && outcome.photo.size > PHOTO_MAX_BYTES) {
      setMessage({ tone: 'danger', text: t('mobile:profile.tooLarge') })
      return
    }
    const body = new FormData()
    body.append('photo', filePart(outcome.photo), outcome.photo.name)
    setBusy(true)
    const { error } = await api.user.PUT('/v1/me/photo', {
      body: body as never,
      bodySerializer: (b: unknown) => b as FormData,
    })
    setBusy(false)
    if (error) {
      setMessage({ tone: 'danger', text: apiMessage(error) ?? t('account:profile.photoFailed') })
      return
    }
    setMessage({ tone: 'ok', text: t('mobile:profile.photoSaved') })
    setVersion((v) => v + 1)
    reload()
  }

  const removePhoto = async () => {
    setBusy(true)
    await api.user.DELETE('/v1/me/photo')
    setBusy(false)
    setVersion((v) => v + 1)
    reload()
  }

  const toggleDay = (day: Day) =>
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    )

  const matches = listable && zoneQuery.trim() ? matchTimeZones(zones, zoneQuery, 8) : []

  return (
    <Screen title={t('account:profile.title')} onBack={onBack} backLabel={t('mobile:back')}>
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

      <Section title={t('account:profile.photo')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar name={u.display_name || u.name} uri={u.photo_url ?? null} size={72} />
          <View style={{ flex: 1, gap: 8 }}>
            <Button
              label={t('mobile:profile.takePhoto')}
              icon="camera"
              variant="secondary"
              compact
              disabled={busy}
              onPress={() => void choosePhoto('camera')}
            />
            <Button
              label={t('mobile:profile.choosePhoto')}
              icon="image"
              variant="secondary"
              compact
              disabled={busy}
              onPress={() => void choosePhoto('library')}
            />
            {u.photo_url ? (
              <Button
                label={t('account:profile.removePhoto')}
                variant="ghost"
                compact
                disabled={busy}
                onPress={() => void removePhoto()}
              />
            ) : null}
          </View>
        </View>
        <Body muted>{t('account:profile.photoHelp')}</Body>
        {explainCamera ? (
          <View style={{ gap: 8 }}>
            <Banner tone="info">{t('mobile:profile.cameraWhy')}</Banner>
            <Button label={t('continue')} onPress={() => void choosePhoto('camera')} />
          </View>
        ) : null}
        {denied ? (
          <View style={{ gap: 8 }}>
            <Banner tone="warn">
              {denied.source === 'camera'
                ? t('mobile:profile.cameraDenied')
                : t('mobile:profile.libraryDenied')}
            </Banner>
            {denied.settings ? (
              <Button
                label={t('mobile:profile.openSettings')}
                variant="secondary"
                onPress={() => void Linking.openSettings()}
              />
            ) : null}
            {denied.source === 'camera' ? (
              <Button
                label={t('mobile:profile.choosePhoto')}
                variant="ghost"
                onPress={() => void choosePhoto('library')}
              />
            ) : null}
          </View>
        ) : null}
      </Section>

      <Section title={t('account:profile.about')}>
        <Row title={u.name} subtitle={t('account:profile.nameHelp')} />
        <Row title={u.email} subtitle={t('account:profile.email')} />
        <Field
          label={t('account:profile.displayName')}
          value={displayName}
          maxLength={100}
          onChangeText={setDisplayName}
          autoComplete="name"
        />
        <Field
          label={t('account:profile.timeZone')}
          help={timeZone ? timeZone : t('account:profile.timeZoneOrg')}
          error={zoneError}
          value={listable ? zoneQuery : timeZone}
          onChangeText={listable ? setZoneQuery : setTimeZone}
          placeholder={listable ? t('mobile:profile.zoneSearch') : deviceTimeZone()}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {matches.map((zone) => (
          <Row
            key={zone}
            title={zone}
            onPress={() => {
              setTimeZone(zone)
              setZoneQuery('')
            }}
          />
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={t('mobile:profile.useDevice', { zone: deviceTimeZone() })}
            variant="ghost"
            compact
            onPress={() => {
              setTimeZone(deviceTimeZone())
              setZoneQuery('')
            }}
          />
          {timeZone ? (
            <Button
              label={t('account:profile.timeZoneOrg')}
              variant="ghost"
              compact
              onPress={() => setTimeZone('')}
            />
          ) : null}
        </View>

        <Body>{t('account:profile.hours')}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DAYS.map((day) => (
            <Chip
              key={day}
              label={t(`account:profile.days.${day}`)}
              selected={days.includes(day)}
              onPress={() => toggleDay(day)}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label={t('account:profile.start')}
              help={t('mobile:profile.timeHint')}
              value={start}
              onChangeText={setStart}
              editable={days.length > 0}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={t('account:profile.end')}
              value={end}
              onChangeText={setEnd}
              editable={days.length > 0}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              error={hoursError}
            />
          </View>
        </View>
        <Button label={t('account:profile.save')} onPress={() => void save()} busy={busy} />
      </Section>

      <Section title={t('account:profile.directory')}>
        {shown.length === 0 ? (
          <Body muted>{t('account:profile.directoryEmpty')}</Body>
        ) : (
          shown.map((field) => (
            <Row
              key={field}
              title={String(directory[field])}
              subtitle={t(`account:profile.fields.${field}`)}
            />
          ))
        )}
        <Body muted>{t('account:profile.directoryHelp')}</Body>
      </Section>

      <Section title={t('account:profile.appearance')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {THEMES.map((theme) => (
            <Chip
              key={theme}
              label={t(`account:profile.themes.${theme}`)}
              selected={preference === theme}
              onPress={() =>
                void savePreferences({ theme }).catch(() =>
                  setMessage({ tone: 'danger', text: t('theme.saveFailed') }),
                )
              }
            />
          ))}
        </View>
      </Section>
    </Screen>
  )
}
