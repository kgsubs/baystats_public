#!/usr/bin/env bash
# baystats.com go-live: static root, nginx vhost, Let's Encrypt cert.
# Run: sudo bash /home/dev/repos/baystats/deploy/golive.sh
set -euo pipefail

DOMAIN=baystats.com
SRC=/home/dev/_prod/baystats.com/dist
ROOT=/var/www/baystats
CONF=/etc/nginx/sites-available/${DOMAIN}.conf
EMAIL="${CERTBOT_EMAIL:?set CERTBOT_EMAIL to the address Let's Encrypt should use}"
M=6; t0=$(date +%s)
step(){ echo; echo "[$1/$M] $2"; }
ok(){ echo "      [OK] $1"; }

step 1 "Preparing static root"
mkdir -p "$ROOT"
chown dev:dev "$ROOT"
rm -rf "${ROOT:?}/dist"
cp -r "$SRC" "$ROOT/dist"
chown -R dev:dev "$ROOT"
chmod -R a+rX "$ROOT"
ok "$ROOT/dist ($(find "$ROOT/dist" -type f | wc -l) files)"

step 2 "Writing nginx vhost (HTTP only; certbot adds TLS)"
cat > "$CONF" <<'NGX'
# /etc/nginx/sites-available/baystats.com.conf
# Vite SPA served from disk; Express API on 127.0.0.1:3457 under /api/.
# Certbot appends the listen 443 / ssl lines on first run.

server {
    listen 80;
    listen [::]:80;
    server_name www.baystats.com;
    return 301 https://baystats.com$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name baystats.com;

    charset utf-8;
    root /var/www/baystats/dist;
    index index.html;

    add_header X-Content-Type-Options "nosniff"                         always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options        "DENY"                            always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location /api/ {
        proxy_pass         http://127.0.0.1:3457;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGX
ln -sfn "$CONF" /etc/nginx/sites-enabled/${DOMAIN}.conf
ok "vhost installed"

step 3 "Testing nginx config"
nginx -t
systemctl reload nginx
ok "nginx reloaded"

step 4 "Requesting certificate for ${DOMAIN} + www"
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \
        --agree-tos -m "$EMAIL" --redirect --non-interactive
ok "certificate issued"

step 5 "Reloading nginx with TLS"
nginx -t
systemctl reload nginx
ok "nginx reloaded"

step 6 "Verifying"
code=$(curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN}/)
api=$(curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN}/api/clearance)
echo "      https://${DOMAIN}/            -> $code"
echo "      https://${DOMAIN}/api/clearance -> $api"
certbot certificates 2>/dev/null | grep -A2 "Certificate Name: ${DOMAIN}" || true

echo
echo "Done in $(( $(date +%s) - t0 ))s."
