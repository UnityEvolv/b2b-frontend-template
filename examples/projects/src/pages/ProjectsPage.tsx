import { Alert, Button, Card, EmptyState, Spinner, toast } from '@unityevolv/unitykit'
import { useLiveEvent, useOrg, useSession } from '@b2b-template/ui-web'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { PROJECTS_PERMISSION, refusal, type Project, type Refusal } from '../api'

type Page = { projects: Project[]; next_cursor?: string }
type Result = { data: Page } | { refused: Refusal }
import { RefusalAlert, useProjects } from '../context'
import { PROJECT_SHARED } from '../live'

/** One page of the list; the service allows up to 100. */
export const PAGE = 20

/**
 * The organization's projects, newest first, a page at a time by the
 * service's cursor. Anyone in the org reads them; only a holder of the
 * `projects` permission is offered to create one. When a project is shared
 * with this person, the list reads again from the first page.
 */
export default function ProjectsPage() {
  const { t } = useTranslation('projects')
  const org = useOrg()
  const { api } = useProjects()
  const canWrite = useSession().permissions.can(PROJECTS_PERMISSION)
  const [rows, setRows] = useState<Project[] | null>(null)
  const [next, setNext] = useState<string | undefined>(undefined)
  const [refused, setRefused] = useState<Refusal | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [version, setVersion] = useState(0)
  const orgId = org?.orgId

  const page = useCallback(
    async (cursor?: string): Promise<Result | null> => {
      if (!api || !orgId) return null
      try {
        const { data, error, response } = await api.GET('/v1/organizations/{org_id}/projects', {
          params: {
            path: { org_id: orgId },
            query: { limit: PAGE, ...(cursor ? { cursor } : {}) },
          },
        })
        return data ? { data } : { refused: refusal(response.status, error) }
      } catch {
        return { refused: refusal(undefined, null) }
      }
    },
    [api, orgId],
  )

  useEffect(() => {
    let current = true
    void page().then((result) => {
      if (!current || !result) return
      if ('data' in result) {
        setRows(result.data.projects)
        setNext(result.data.next_cursor)
        setRefused(null)
      } else {
        setRefused(result.refused)
      }
    })
    return () => {
      current = false
    }
  }, [page, version])

  useLiveEvent(PROJECT_SHARED, () => {
    toast.info(t('live.shared'))
    setVersion((v) => v + 1)
  })

  const loadMore = async () => {
    if (!next) return
    setLoadingMore(true)
    const result = await page(next)
    setLoadingMore(false)
    if (!result) return
    if ('data' in result) {
      setRows((r) => [...(r ?? []), ...result.data.projects])
      setNext(result.data.next_cursor)
    } else {
      setRefused(result.refused)
    }
  }

  if (!api || !org) return <EmptyState icon="file" titleAs="h2" title={t('errors.notConnected')} />

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
          <p className="text-base-content/70 text-sm">{t('list.intro')}</p>
        </div>
        {canWrite && (
          <Link className="btn btn-primary" to="/projects/new">
            {t('list.new')}
          </Link>
        )}
      </div>
      {!canWrite && (
        <Alert variant="info" className="mb-4">
          {t('list.readOnly')}
        </Alert>
      )}
      <RefusalAlert refusal={refused} />
      {refused && rows === null ? (
        <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>
          {t('list.retry')}
        </Button>
      ) : rows === null ? (
        <Spinner block size="lg" label={t('list.loading')} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="file"
          titleAs="h2"
          title={t('list.empty')}
          description={canWrite ? t('list.emptyWriter') : t('list.emptyReader')}
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('list.title')}>
            {rows.map((project) => (
              <li key={project.id}>
                <Card>
                  {project.cover_url && (
                    <img
                      src={project.cover_url}
                      alt={t('cover.alt', { name: project.name })}
                      className="mb-3 h-32 w-full rounded object-cover"
                    />
                  )}
                  <Link className="link font-semibold" to={`/projects/${project.id}`}>
                    {project.name}
                  </Link>
                  {project.description && (
                    <p className="text-base-content/70 mt-1 line-clamp-2 text-sm">
                      {project.description}
                    </p>
                  )}
                  <p className="text-base-content/70 mt-2 text-xs">
                    {t('list.members', { count: project.member_count })}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
          {next && (
            <div className="mt-6 flex justify-center">
              {loadingMore ? (
                <Spinner label={t('list.loadingMore')} />
              ) : (
                <Button variant="secondary" onClick={() => void loadMore()}>
                  {t('list.more')}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
