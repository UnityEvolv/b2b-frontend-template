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
this repository):

```sh
npm run sync -w @b2b-template/api
npm run sync -w @b2b-template/api -- /path/to/backend
BACKEND_DIR=/path/to/backend npm run sync -w @b2b-template/api
```

CI regenerates from `specs/` and fails if `src/generated/` differs, so a hand
edit to generated code cannot land.
