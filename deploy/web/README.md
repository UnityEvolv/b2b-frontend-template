# Serving the web apps

Each web app is a container: its static build behind nginx, sending the
security headers from `headers.json` on every response (UO-43).

```sh
docker build --build-arg APP=ofis -f deploy/web.Dockerfile -t web-ofis .
docker run --rm -p 8080:8080 -e API_ORIGIN=https://api.example -e REALTIME_ORIGIN=wss://rt.example web-ofis
```

- `headers.json` is generated from `tools/app-config/headers.mjs` and checked
  by CI; `tools/app-config/generate-nginx-headers.mjs` turns it into nginx
  `add_header` lines at image build time.
- The policy's placeholders (`__API_ORIGIN__`, `__REALTIME_ORIGIN__`) are
  filled at container start from `API_ORIGIN` and `REALTIME_ORIGIN`, which
  the deployment derives from the base hostname. Unset, a placeholder is
  dropped rather than served.
- The page's policy also carries the origins the org's RTC providers need
  (LiveKit's hosts, say). The office app names the org in a `uo_org` cookie;
  as nginx serves the page it asks the rtc service's public
  `/rtc/v1/page-origins/{org_id}` on `API_ORIGIN` and fills the
  `__PROVIDER_*__` placeholders from its `X-Csp-*` headers. Each org's answer
  is cached for a minute. With no cookie, a malformed one, or an API that
  fails or takes over two seconds, the page gets the base policy.
  A page served before the cookie named the org reloads once, when a call
  first needs a provider. Without `API_ORIGIN` the placeholders are dropped.
- Hashed assets are cached for a year; the page is never cached, so a deploy
  is seen on the next load. Every client-side route serves the index.
- `/healthz` answers for the load balancer. nginx runs as its own user on 8080.
- `VITE_RELEASE`, `VITE_SENTRY_DSN`, `VITE_RECAPTCHA_SITE_KEY` and the origins
  (`VITE_API_ORIGIN`, `VITE_REALTIME_ORIGIN`, `VITE_ADMIN_ORIGIN`) are build
  arguments: the release is the commit, the DSN and the site key are repository
  variables, and the origins are derived from `BASE_HOSTNAME` in the deploy
  workflow.

`.github/workflows/deploy.yml` builds and pushes the three images on every
merge to `main` and moves the dev environment's Cloud Run services to them,
when the environment is up. It needs the same three repository variables as
the backend's workflow (`GCP_WORKLOAD_IDENTITY_PROVIDER`,
`GCP_DEPLOY_SERVICE_ACCOUNT`, `BASE_HOSTNAME`), set from the backend's
Terraform outputs.
