import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  toast,
} from '@unityevolv/unitykit'
import type { user } from '@b2b-template/api'
import { useLiveEvent, useOrg, useSession } from '@b2b-template/ui-web'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'

import {
  COVER_MAX_BYTES,
  COVER_TYPES,
  PROJECTS_PERMISSION,
  refusal,
  type Project,
  type ProjectMember,
  type Refusal,
} from '../api'
import { RefusalAlert, useProjects } from '../context'
import { PROJECT_SHARED } from '../live'

type Membership = user.components['schemas']['Membership']

/** The org's active members, for names and for sharing: one page, as many as the service gives. */
const PEOPLE = 200

const nameOf = (m: Membership) => m.user.display_name || m.user.name

/**
 * One project: its details, who it is shared with and its cover. Anyone in
 * the org sees it; changing it needs the `projects` permission, so without
 * it the fields are read-only and the controls that change it are not
 * offered. The service refuses a direct call all the same, and a refusal is
 * shown in its words. It reads again after every change, and when a
 * `project.shared` event names it.
 */
export default function ProjectPage() {
  const { t, i18n } = useTranslation('projects')
  const { projectId = '' } = useParams()
  const org = useOrg()
  const { api, upload } = useProjects()
  const canWrite = useSession().permissions.can(PROJECTS_PERMISSION)
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [missing, setMissing] = useState(false)
  const [members, setMembers] = useState<ProjectMember[] | null>(null)
  const [people, setPeople] = useState<Membership[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [chosen, setChosen] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [refused, setRefused] = useState<Refusal | null>(null)
  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)

  const orgId = org?.orgId
  const templateApi = org?.api

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    const path = { org_id: orgId, project_id: projectId }
    void Promise.all([
      api.GET('/v1/organizations/{org_id}/projects/{project_id}', { params: { path } }),
      api.GET('/v1/organizations/{org_id}/projects/{project_id}/members', { params: { path } }),
    ]).then(([p, m]) => {
      if (!current) return
      if (!p.data) {
        if (p.response.status === 404) setMissing(true)
        else setRefused(refusal(p.response.status, p.error))
        return
      }
      setProject(p.data)
      setName(p.data.name)
      setDescription(p.data.description)
      setMembers(m.data?.members ?? [])
    })
    return () => {
      current = false
    }
  }, [api, orgId, projectId, version])

  // Names for the people it is shared with, and whom it could be shared with.
  useEffect(() => {
    if (!templateApi || !orgId) return
    let current = true
    void templateApi.user
      .GET('/v1/organizations/{org_id}/memberships', {
        params: { path: { org_id: orgId }, query: { limit: PEOPLE, status: 'active' } },
      })
      .then(({ data }) => current && setPeople(data?.memberships ?? []))
    return () => {
      current = false
    }
  }, [templateApi, orgId])

  useLiveEvent(PROJECT_SHARED, (event) => {
    if (!event.data?.project_id || event.data.project_id === projectId) reload()
  })

  if (!api || !org) return <EmptyState icon="file" titleAs="h2" title={t('errors.notConnected')} />
  if (missing) return <EmptyState icon="search" titleAs="h2" title={t('detail.missing')} />
  if (!project) {
    return refused ? (
      <RefusalAlert refusal={refused} />
    ) : (
      <Spinner block size="lg" label={t('detail.loading')} />
    )
  }

  const path = { org_id: org.orgId, project_id: project.id }
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const byId = new Map(people.map((m) => [m.id, m]))
  const shared = new Set(members?.map((m) => m.membership_id))
  const candidates = people.filter((m) => !shared.has(m.id))
  const who = (membershipId: string) => {
    const m = byId.get(membershipId)
    return m ? nameOf(m) : t('members.unknown')
  }

  /** Runs one change; a refusal stays on the page, anything else reads fresh. */
  const change = async (
    call: () => Promise<{ error?: unknown; response: Response }>,
    done: string,
  ): Promise<boolean> => {
    setRefused(null)
    try {
      const { error, response } = await call()
      if (!response.ok) {
        setRefused(refusal(response.status, error))
        return false
      }
    } catch {
      setRefused(refusal(undefined, null))
      return false
    }
    toast.success(done)
    reload()
    return true
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    void change(
      () =>
        api.PATCH('/v1/organizations/{org_id}/projects/{project_id}', {
          params: { path },
          body: { name: name.trim(), description: description.trim() },
        }),
      t('detail.saved'),
    )
  }

  const remove = async () => {
    setConfirmDelete(false)
    setRefused(null)
    try {
      const { error, response } = await api.DELETE(
        '/v1/organizations/{org_id}/projects/{project_id}',
        { params: { path } },
      )
      if (!response.ok) return setRefused(refusal(response.status, error))
    } catch {
      return setRefused(refusal(undefined, null))
    }
    toast.success(t('detail.deleted'))
    void navigate('/projects')
  }

  const share = async () => {
    const membershipId = chosen
    if (!membershipId) return
    const ok = await change(
      () =>
        api.PUT('/v1/organizations/{org_id}/projects/{project_id}/members/{membership_id}', {
          params: { path: { ...path, membership_id: membershipId } },
        }),
      t('members.added', { name: who(membershipId) }),
    )
    if (ok) setChosen('')
  }

  const unshare = (membershipId: string) =>
    void change(
      () =>
        api.DELETE('/v1/organizations/{org_id}/projects/{project_id}/members/{membership_id}', {
          params: { path: { ...path, membership_id: membershipId } },
        }),
      t('members.removed', { name: who(membershipId) }),
    )

  /**
   * The cover: ask the service for a signed upload URL for exactly this
   * type and size, PUT the file there with that Content-Type, then read the
   * project again for its fresh cover link.
   */
  const chooseCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!(COVER_TYPES as readonly string[]).includes(file.type)) {
      return setRefused({ kind: 'error', error: { code: 'cover', message: t('cover.wrongType') } })
    }
    if (file.size > COVER_MAX_BYTES) {
      return setRefused({ kind: 'error', error: { code: 'cover', message: t('cover.tooLarge') } })
    }
    setRefused(null)
    setUploading(true)
    try {
      const { data, error, response } = await api.POST(
        '/v1/organizations/{org_id}/projects/{project_id}/cover',
        { params: { path }, body: { content_type: file.type, size: file.size } },
      )
      if (!data) return setRefused(refusal(response.status, error))
      const put = await upload(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!put.ok) {
        return setRefused({ kind: 'error', error: { code: 'cover', message: t('cover.failed') } })
      }
      toast.success(t('cover.uploaded'))
      reload()
    } catch {
      setRefused({ kind: 'error', error: { code: 'cover', message: t('cover.failed') } })
    } finally {
      setUploading(false)
    }
  }

  const removeCover = () =>
    void change(
      () =>
        api.DELETE('/v1/organizations/{org_id}/projects/{project_id}/cover', { params: { path } }),
      t('cover.removed'),
    )

  return (
    <>
      <Link to="/projects" className="link mb-4 inline-block text-sm">
        {t('detail.back')}
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-base-content/70 text-sm">
            {t('detail.created', { when: date.format(new Date(project.created_at)) })}
          </p>
        </div>
        {canWrite && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            {t('detail.delete')}
          </Button>
        )}
      </div>
      <RefusalAlert refusal={refused} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card header={t('detail.details')}>
          <form className="space-y-4" onSubmit={save}>
            <Input
              label={t('detail.name')}
              required
              maxLength={200}
              readOnly={!canWrite}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              label={t('detail.description')}
              maxLength={2000}
              readOnly={!canWrite}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {canWrite && (
              <Button type="submit" disabled={name.trim() === ''}>
                {t('detail.save')}
              </Button>
            )}
          </form>
        </Card>

        <Card header={t('cover.title')}>
          {project.cover_url ? (
            <img
              src={project.cover_url}
              alt={t('cover.alt', { name: project.name })}
              className="mb-3 max-h-48 w-full rounded object-cover"
            />
          ) : (
            <p className="mb-3 text-sm">{t('cover.none')}</p>
          )}
          {canWrite && (
            <div className="space-y-2">
              <Input
                type="file"
                label={t('cover.choose')}
                help={t('cover.help')}
                accept={COVER_TYPES.join(',')}
                disabled={uploading}
                onChange={(e) => void chooseCover(e)}
              />
              {uploading && <Spinner label={t('cover.uploading')} />}
              {project.cover_url && (
                <Button variant="secondary" onClick={removeCover}>
                  {t('cover.remove')}
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card header={t('members.title')}>
          {members === null ? (
            <Spinner label={t('members.loading')} />
          ) : members.length === 0 ? (
            <p className="text-sm">{t('members.none')}</p>
          ) : (
            <ul className="mb-4 space-y-2 text-sm" aria-label={t('members.title')}>
              {members.map((m) => (
                <li key={m.membership_id} className="flex items-center justify-between gap-2">
                  <span>{who(m.membership_id)}</span>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t('members.remove', { name: who(m.membership_id) })}
                      onClick={() => unshare(m.membership_id)}
                    >
                      {t('members.removeShort')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canWrite &&
            members !== null &&
            (candidates.length === 0 ? (
              <p className="text-base-content/70 text-sm">{t('members.everyone')}</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <Select
                  label={t('members.person')}
                  placeholder={t('members.choose')}
                  value={chosen}
                  onChange={(e) => setChosen(e.target.value)}
                >
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {nameOf(m)}
                    </option>
                  ))}
                </Select>
                <Button disabled={!chosen} onClick={() => void share()}>
                  {t('members.add')}
                </Button>
              </div>
            ))}
        </Card>
      </div>
      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('detail.deleteTitle', { name: project.name })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('detail.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              {t('detail.delete')}
            </Button>
          </>
        }
      >
        {t('detail.deleteWarning')}
      </Modal>
    </>
  )
}
