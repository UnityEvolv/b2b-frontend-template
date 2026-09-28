#!/bin/sh
# Fill the policy's deploy placeholders from the environment the container
# was started with: the API and realtime origins, derived from the base
# hostname by whoever deploys, and the error tracker's ingest origin. Runs
# before nginx starts.
set -eu
dir=/etc/nginx/unityofis
template=$dir/headers.conf.template
out=$dir/headers.conf
api="${API_ORIGIN:-}"
realtime="${REALTIME_ORIGIN:-}"
errors="${ERROR_ORIGIN:-}"
# Where signed links to uploaded images point: the upload bucket.
storage="${STORAGE_ORIGIN:-}"
# The realtime service also serves the office backgrounds: its socket origin,
# over https (or http beside ws on a laptop).
images="$(printf '%s' "$realtime" | sed -e 's|^wss://|https://|' -e 's|^ws://|http://|')"

# The org's provider origins (UO-142): with an API to ask, each page's
# policy carries what the rtc service answers for the org the page's cookie
# names, as nginx variables; without one, the placeholders are dropped.
if [ -n "$api" ]; then
  connect=' $csp_connect' media=' $csp_media' worker=' $csp_worker' frame=' $csp_frame' script=' $csp_script'
  # nginx looks the API's host up itself, with the container's resolver.
  resolver="$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)"
  case "$resolver" in *:*) resolver="[$resolver]" ;; esac
  cat > "$dir/page-origins.conf" <<EOF
resolver ${resolver:-127.0.0.11} valid=60s ipv6=off;

# Asked as each page is served. Anything but an org id in the cookie, and
# any failure or slowness of the API, is the base policy: never an error
# page, never a wait of more than two seconds.
location = /_page-origins {
  internal;
  if (\$cookie_uo_org !~ "^[0-9a-fA-F-]{36}\$") {
    return 204;
  }
  # Nothing of the visitor's goes to the API: no cookie, no header.
  proxy_pass_request_headers off;
  proxy_pass_request_body off;
  proxy_set_header Content-Length "";
  proxy_ssl_server_name on;
  proxy_connect_timeout 2s;
  proxy_send_timeout 2s;
  proxy_read_timeout 2s;
  # One try: a slow API must not hold the page for every address it has.
  proxy_next_upstream off;
  proxy_cache page_origins;
  proxy_cache_key \$cookie_uo_org;
  proxy_cache_valid 200 204 60s;
  proxy_cache_use_stale error timeout updating;
  proxy_ignore_headers Cache-Control Expires Set-Cookie;
  proxy_intercept_errors on;
  error_page 400 403 404 429 500 502 503 504 = @base-policy;
  proxy_pass $api/rtc/v1/page-origins/\$cookie_uo_org;
}

location @base-policy {
  return 204;
}
EOF
  cat > "$dir/page-origins-ask.conf" <<'EOF'
auth_request /_page-origins;
auth_request_set $csp_connect $upstream_http_x_csp_connect;
auth_request_set $csp_media $upstream_http_x_csp_media;
auth_request_set $csp_worker $upstream_http_x_csp_worker;
auth_request_set $csp_frame $upstream_http_x_csp_frame;
auth_request_set $csp_script $upstream_http_x_csp_script;
EOF
else
  connect='' media='' worker='' frame='' script=''
  : > "$dir/page-origins.conf"
  : > "$dir/page-origins-ask.conf"
fi

# A placeholder with no value is dropped rather than served.
sed -e "s| __API_ORIGIN__|${api:+ $api}|g" \
  -e "s| __REALTIME_ORIGIN__|${realtime:+ $realtime}|g" \
  -e "s| __IMAGE_ORIGIN__|${images:+ $images}|g" \
  -e "s| __ERROR_ORIGIN__|${errors:+ $errors}|g" \
  -e "s| __STORAGE_ORIGIN__|${storage:+ $storage}|g" \
  -e "s| __PROVIDER_CONNECT__|$connect|g" \
  -e "s| __PROVIDER_MEDIA__|$media|g" \
  -e "s| __PROVIDER_WORKER__|$worker|g" \
  -e "s| __PROVIDER_FRAME__|$frame|g" \
  -e "s| __PROVIDER_SCRIPT__|$script|g" \
  "$template" > "$out"
