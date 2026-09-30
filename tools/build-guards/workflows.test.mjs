import { describe, expect, it } from 'vitest'

import { checkWorkflow, guarded, UPSTREAM } from './workflows.mjs'

const READ = { contents: 'read' }
const GUARD = `github.repository == '${UPSTREAM}' && github.ref == 'refs/heads/main'`

describe('guarded', () => {
  it('passes the upstream repository with main, a tag, or either', () => {
    expect(guarded(GUARD)).toBe(true)
    expect(guarded(`\${{ ${GUARD} }}`)).toBe(true)
    expect(
      guarded(
        `github.repository == '${UPSTREAM}' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/')) && !cancelled()`,
      ),
    ).toBe(true)
  })

  it('refuses a missing half, another repository, or an || that lets a fork through', () => {
    expect(guarded(undefined)).toBe(false)
    expect(guarded("github.ref == 'refs/heads/main'")).toBe(false)
    expect(guarded(`github.repository == '${UPSTREAM}'`)).toBe(false)
    expect(guarded("github.repository == 'someone/fork' && github.ref == 'refs/heads/main'")).toBe(
      false,
    )
    expect(guarded(`${GUARD} || github.event_name == 'workflow_dispatch'`)).toBe(false)
  })
})

describe('checkWorkflow', () => {
  const step = (run) => ({ steps: [{ run }] })

  it('passes a read-only workflow whose jobs need no secret', () => {
    const workflow = { on: { pull_request: {} }, permissions: READ, jobs: { a: step('npm test') } }
    expect(checkWorkflow('ci.yml', workflow)).toEqual([])
  })

  it('asks for read-only permissions at the top', () => {
    expect(checkWorkflow('a.yml', { on: 'push', jobs: {} })).toHaveLength(1)
    expect(
      checkWorkflow('a.yml', { on: 'push', permissions: { contents: 'write' }, jobs: {} }),
    ).toHaveLength(1)
    expect(checkWorkflow('a.yml', { on: 'push', permissions: 'write-all', jobs: {} })).toHaveLength(
      1,
    )
  })

  it('refuses checking out code under pull_request_target', () => {
    const workflow = {
      on: ['pull_request_target'],
      permissions: READ,
      jobs: { label: { steps: [{ uses: 'actions/checkout@v7' }] } },
    }
    expect(checkWorkflow('a.yml', workflow)[0]).toMatch(/pull_request_target/)
  })

  it('keeps a job with a secret or an environment to the upstream main or a tag', () => {
    const deploy = { steps: [{ run: 'deploy', env: { TOKEN: '${{ secrets.DEPLOY_TOKEN }}' } }] }
    const workflow = { on: { push: {} }, permissions: READ, jobs: { deploy } }
    expect(checkWorkflow('a.yml', workflow)).toHaveLength(1)
    expect(
      checkWorkflow('a.yml', { ...workflow, jobs: { deploy: { ...deploy, if: GUARD } } }),
    ).toEqual([])
    expect(
      checkWorkflow('a.yml', {
        ...workflow,
        jobs: { release: { environment: 'production', steps: [] } },
      }),
    ).toHaveLength(1)
  })

  it('leaves the run token alone, and refuses a secret for every job', () => {
    const job = { steps: [{ run: 'gh', env: { GH_TOKEN: '${{ secrets.GITHUB_TOKEN }}' } }] }
    expect(checkWorkflow('a.yml', { on: 'push', permissions: READ, jobs: { job } })).toEqual([])
    expect(
      checkWorkflow('a.yml', {
        on: 'push',
        permissions: READ,
        env: { KEY: '${{ secrets.KEY }}' },
        jobs: {},
      }),
    ).toHaveLength(1)
  })
})
