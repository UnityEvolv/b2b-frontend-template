# @b2b-template/api

The typed client for every backend service, generated from the services'
OpenAPI contracts.

```ts
import { createApi, isApiError } from '@b2b-template/api'

const api = createApi({ baseUrl: (service) => config.serviceUrl(service), getToken })
const { data, error } = await api.organization.GET('/v1/organizations/{org_id}', {
  params: { path: { org_id } },
})
if (error) showError(error.message) // error is { code, message, fields? }
```

## Where it comes from

| | |
|---|---|
| `specs/*.yaml` | copies of the backend's `api/*.yaml`. **Never edit.** |
| `src/generated/` | generated from `specs/` by `npm run generate`. **Never edit.** |
| `src/index.ts` | `createApi`: one client per service, bearer token attached. Written by hand, once; nothing in it is per endpoint. |

To sync from a backend checkout (by default `../b2b-backend-template`, beside
this repository; a path given as an argument, or else in `BACKEND_DIR`, wins):

```sh
npm run sync -w @b2b-template/api
npm run sync -w @b2b-template/api -- /path/to/backend
BACKEND_DIR=/path/to/backend npm run sync -w @b2b-template/api
```

`sync` stops with a message naming the path it looked at when no backend is
there. Nothing else needs a backend: `generate` and `check:api-generated` read
only the committed `specs/`, so a fork without a backend checkout builds and
passes CI.

## Changing a contract

1. Change the contract in the backend (`api/<service>.yaml`) and land it there.
2. Here, with that backend checked out:
   `npm run sync -w @b2b-template/api -- <path>`. This copies `api/*.yaml` into
   `specs/`, drops contracts the backend removed, and runs `generate`.
3. Fix any code the new types break, run `npm run check`, and commit `specs/`
   and `src/generated/` together with those fixes.

CI regenerates from `specs/` and fails if `src/generated/` differs, so a hand
edit to generated code, or a spec copied without regenerating, cannot land.

### From the backend automatically

The backend repository gets a workflow that, when a contract changes on its
`main`, runs this same sync and opens a pull request here with the regenerated
client. Its token lives only in the upstream backend's secrets and the
workflow is skipped on forks; this repository needs no secret for it. The pull
request is an ordinary one: CI checks it, and code the new types break is fixed
on that branch before it merges. (The workflow is added on the backend side;
until it lands, sync by hand as above.)
