#!/usr/bin/env bash
# Go-live: static root, nginx vhost (deploy/nginx.conf), Let's Encrypt cert.
# Run: sudo APP_DIR=/path/to/deployed/repo DOMAIN=example.com CERTBOT_EMAIL=you@example.com bash deploy/golive.sh
#
# deploy/nginx.conf is the one nginx config for this site; this script
# fills in its {{DOMAIN}} placeholder and installs the result, so there is
# only ever one config template to keep in sync.
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN to the domain being deployed, e.g. example.com}"
APP_DIR="${APP_DIR:?Set APP_DIR to the deployed repo path (contains dist/ and deploy/nginx.conf)}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL to the address certbot should register}"
SRC="$APP_DIR/dist"
ROOT=/var/www/baystats
CONF=/etc/nginx/sites-available/${DOMAIN}.conf
NGINX_SRC="$APP_DIR/deploy/nginx.conf"
OWNER="$(id -un):$(id -gn)"
M=6; t0=$(date +%s)
step(){ echo; echo "[$1/$M] $2"; }
ok(){ echo "      [OK] $1"; }

# If this script stops nginx to free port 80 for certbot and anything
# after that fails, nginx must come back up: this box may serve other
# sites, and a failed go-live for this one must not take them all down.
NGINX_STOPPED=0
restart_nginx_if_stopped() {
  if [ "$NGINX_STOPPED" = "1" ]; then
    systemctl start nginx 2>/dev/null || true
  fi
}
trap restart_nginx_if_stopped EXIT

step 1 "Preparing static root"
mkdir -p "$ROOT"
chown "$OWNER" "$ROOT"
rm -rf "${ROOT:?}/dist"
cp -r "$SRC" "$ROOT/dist"
chown -R "$OWNER" "$ROOT"
chmod -R a+rX "$ROOT"
ok "$ROOT/dist ($(find "$ROOT/dist" -type f | wc -l) files)"

step 2 "Requesting a certificate for ${DOMAIN} + www"
# deploy/nginx.conf references the certificate files directly, so they
# must exist before nginx can load it. --standalone runs certbot's own
# tiny web server on port 80 to pass the ACME challenge, so nginx is
# stopped for this step only.
systemctl stop nginx 2>/dev/null || true
NGINX_STOPPED=1
certbot certonly --standalone -d "${DOMAIN}" -d "www.${DOMAIN}" \
        --agree-tos -m "$CERTBOT_EMAIL" --non-interactive
ok "certificate ready"

step 3 "Installing the nginx vhost"
sed "s/{{DOMAIN}}/${DOMAIN}/g" "$NGINX_SRC" > "$CONF"
ln -sfn "$CONF" /etc/nginx/sites-enabled/${DOMAIN}.conf
ok "vhost installed from $NGINX_SRC"

step 4 "Testing and starting nginx"
nginx -t
systemctl start nginx
NGINX_STOPPED=0
ok "nginx started"

step 5 "Checking renewal"
certbot renew --dry-run
ok "renewal check passed"

step 6 "Verifying"
code=$(curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN}/)
api=$(curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN}/api/clearance)
echo "      https://${DOMAIN}/            -> $code"
echo "      https://${DOMAIN}/api/clearance -> $api"
certbot certificates 2>/dev/null | grep -A2 "Certificate Name: ${DOMAIN}" || true

echo
echo "Done in $(( $(date +%s) - t0 ))s."
