# syntax=docker/dockerfile:1
# A web app as a container: the static build behind nginx, with the
# security headers from deploy/web/headers.json (UO-43). Build context is
# the repository root; APP is account, admin or platform.
#
#   docker build --build-arg APP=account -f deploy/web.Dockerfile -t web-account .

FROM node:22-alpine AS build
ARG APP
ARG VITE_RELEASE=
ARG VITE_SENTRY_DSN=
ARG VITE_RECAPTCHA_SITE_KEY=
ARG VITE_API_ORIGIN=
# Where source maps are uploaded, when the build is given a token as the
# secret sentry_auth_token; without all three, nothing is uploaded.
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
WORKDIR /src
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tools ./tools
COPY deploy/web/headers.json ./deploy/web/headers.json
RUN npm ci --no-audit --no-fund
RUN --mount=type=secret,id=sentry_auth_token,required=false \
  test -n "${APP}" \
  && SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
     SENTRY_ORG="${SENTRY_ORG}" SENTRY_PROJECT="${SENTRY_PROJECT}" \
     VITE_RELEASE="${VITE_RELEASE}" VITE_SENTRY_DSN="${VITE_SENTRY_DSN}" VITE_RECAPTCHA_SITE_KEY="${VITE_RECAPTCHA_SITE_KEY}" VITE_API_ORIGIN="${VITE_API_ORIGIN}" \
     npm run build -w "@b2b-template/app-${APP}" \
  && node tools/app-config/generate-nginx-headers.mjs > /src/headers.conf

FROM nginx:1.27-alpine
ARG APP
COPY deploy/web/nginx.conf /etc/nginx/nginx.conf
COPY deploy/web/entrypoint.sh /docker-entrypoint.d/40-app-headers.sh
COPY --from=build /src/headers.conf /etc/nginx/app/headers.conf.template
COPY --from=build /src/apps/${APP}/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-app-headers.sh \
  && mkdir -p /etc/nginx/app && chown -R nginx:nginx /etc/nginx/app /var/cache/nginx /var/run
USER nginx
EXPOSE 8080
