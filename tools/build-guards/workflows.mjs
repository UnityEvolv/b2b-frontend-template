/**
 * Fail when a GitHub Actions workflow is not safe to run on a public repo
 * that anyone can fork and open a pull request against.
 *
 * - Every workflow defaults to read-only: a top-level `permissions` of
 *   `contents: read` and nothing more. A job that needs more asks for it.
 * - No `pull_request_target` workflow checks out code: that trigger runs with
 *   the base repository's secrets and a write token, so running the pull
 *   request's code there hands both to whoever opened it.
 * - A job that uses a secret (other than the run's own GITHUB_TOKEN) or a
 *   deployment environment runs only on the upstream repository, and only
 *   from main or a tag. A fork, or a pull request, skips it.
 *
 * A product that forks the template changes UPSTREAM to its own repository.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse } from 'yaml'

export const UPSTREAM = 'UnityEvolv/b2b-frontend-template'

// Only inside an expression: `secrets.md` in a shell line is a file name.
const SECRET = /\$\{\{[^}]*\bsecrets\.(?!GITHUB_TOKEN\b)\w/

/** The event names a workflow's `on` lists, whatever its shape. */
function events(on) {
  if (typeof on === 'string') return [on]
  if (Array.isArray(on)) return on
  return Object.keys(on ?? {})
}

/** Whether a job's `if` keeps it to the upstream repository and to main or a tag. */
export function guarded(condition) {
  const text = String(condition ?? '')
    .replace(/^\s*\$\{\{|\}\}\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const repo = `github\\.repository == '${UPSTREAM.replace(/[.]/g, '\\.')}'`
  const ref = `(?:github\\.ref == 'refs/heads/main'|startsWith\\(github\\.ref, 'refs/tags/'\\))`
  // The upstream check first, then main or a tag, then anything else only
  // joined by `&&`: an `||` outside the parentheses would let a fork through.
  const shape = new RegExp(`^${repo} && (?:${ref}|\\(${ref}(?: \\|\\| ${ref})*\\))(?: && (.+))?$`)
  const match = shape.exec(text)
  return Boolean(match) && !(match[1] ?? '').includes('||')
}

/** Problems with one parsed workflow, as sentences. */
export function checkWorkflow(name, workflow) {
  const problems = []
  const permissions = workflow?.permissions
  const readOnly =
    permissions &&
    typeof permissions === 'object' &&
    Object.keys(permissions).length === 1 &&
    permissions.contents === 'read'
  if (!readOnly) {
    problems.push(`${name}: the top-level permissions must be exactly \`contents: read\`.`)
  }

  if (SECRET.test(JSON.stringify(workflow?.env ?? {}))) {
    problems.push(
      `${name}: a secret in the workflow-level env reaches every job; give it to the one job that needs it.`,
    )
  }

  const targetsPullRequests = events(workflow?.on).includes('pull_request_target')
  for (const [id, job] of Object.entries(workflow?.jobs ?? {})) {
    const steps = job?.steps ?? []
    if (
      targetsPullRequests &&
      steps.some((step) => String(step?.uses ?? '').startsWith('actions/checkout'))
    ) {
      problems.push(
        `${name}: job ${id} checks out code under pull_request_target, which runs it with the base repository's secrets.`,
      )
    }
    const usesSecrets = SECRET.test(JSON.stringify(job ?? {})) || job?.secrets === 'inherit'
    if ((usesSecrets || job?.environment) && !guarded(job?.if)) {
      problems.push(
        `${name}: job ${id} uses a secret or an environment, so its \`if\` must require ` +
          `github.repository == '${UPSTREAM}' and github.ref == 'refs/heads/main' ` +
          `or startsWith(github.ref, 'refs/tags/').`,
      )
    }
  }
  return problems
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const dir = join(root, '.github', 'workflows')
  const files = (await readdir(dir)).filter((file) => /\.ya?ml$/.test(file))
  const problems = []
  for (const file of files) {
    const workflow = parse(await readFile(join(dir, file), 'utf8'))
    problems.push(...checkWorkflow(`.github/workflows/${file}`, workflow))
  }
  for (const problem of problems) console.error(problem)
  if (problems.length > 0) process.exitCode = 1
  else console.log(`All ${files.length} workflows are safe to run on forks.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
