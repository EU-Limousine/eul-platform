#!/usr/bin/env bash
# Step 4 — HTTPS load balancer for the custom domains (run AFTER the first deploy).
#   bash infrastructure/gcp/4-load-balancer.sh
# Why not Cloud Run domain mapping: Google marks it Preview and "not recommended for production".
# One global external Application Load Balancer per project serves (production / staging):
#   eulimousine.com       / staging.eulimousine.com      → eul-web   (production: www → 301 to apex)
#   app.eulimousine.com   / app-staging.eulimousine.com  → eul-dashboard
#   api.eulimousine.com   / api-staging.eulimousine.com  → eul-api (WebSockets supported)
# with one Google-managed certificate. Afterwards the run.app URLs are closed to the internet.
# Staging answers every request with "X-Robots-Tag: noindex" so search engines never list it.
set -euo pipefail
source "$(dirname "$0")/config.sh"

log "Static IP"
gcloud compute addresses describe eul-lb-ip --global >/dev/null 2>&1 \
  || gcloud compute addresses create eul-lb-ip --global --ip-version=IPV4
IP=$(gcloud compute addresses describe eul-lb-ip --global --format='value(address)')
ok "$IP"

log "Serverless NEGs + backend services"
for S in web api dashboard; do
  gcloud compute network-endpoint-groups describe "neg-$S" --region="$REGION" >/dev/null 2>&1 \
    || gcloud compute network-endpoint-groups create "neg-$S" --region="$REGION" \
      --network-endpoint-type=serverless --cloud-run-service="eul-$S"
  if ! gcloud compute backend-services describe "be-$S" --global >/dev/null 2>&1; then
    gcloud compute backend-services create "be-$S" --global --load-balancing-scheme=EXTERNAL_MANAGED
    gcloud compute backend-services add-backend "be-$S" --global \
      --network-endpoint-group="neg-$S" --network-endpoint-group-region="$REGION"
  fi
  if [ "$NOINDEX" = "true" ]; then
    gcloud compute backend-services update "be-$S" --global \
      --custom-response-header='X-Robots-Tag: noindex, nofollow' --quiet >/dev/null
  fi
  ok "be-$S → eul-$S"
done

log "URL map (host routing + www redirect)"
WWW_HOSTRULE=""; WWW_MATCHER=""; CERT_DOMAINS="${WEB_HOST},${APP_HOST},${API_HOST}"
if [ "$WWW_REDIRECT" = "true" ]; then
  WWW_HOSTRULE="- hosts: ['www.${WEB_HOST}']
  pathMatcher: www"
  WWW_MATCHER="- name: www
  defaultUrlRedirect:
    hostRedirect: ${WEB_HOST}
    redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
    httpsRedirect: true
    stripQuery: false"
  CERT_DOMAINS="${WEB_HOST},www.${WEB_HOST},${APP_HOST},${API_HOST}"
fi
URLMAP_FILE=$(mktemp)
cat >"$URLMAP_FILE" <<EOF
name: ${LB_NAME}
defaultService: projects/${PROJECT_ID}/global/backendServices/be-web
hostRules:
- hosts: ['${APP_HOST}']
  pathMatcher: dashboard
- hosts: ['${API_HOST}']
  pathMatcher: api
${WWW_HOSTRULE}
pathMatchers:
- name: dashboard
  defaultService: projects/${PROJECT_ID}/global/backendServices/be-dashboard
- name: api
  defaultService: projects/${PROJECT_ID}/global/backendServices/be-api
${WWW_MATCHER}
EOF
gcloud compute url-maps import "$LB_NAME" --global --source="$URLMAP_FILE" --quiet
rm -f "$URLMAP_FILE"
ok "$LB_NAME"

log "Google-managed certificate (becomes ACTIVE only after the DNS records point here)"
gcloud compute ssl-certificates describe eul-cert --global >/dev/null 2>&1 \
  || gcloud compute ssl-certificates create eul-cert --global \
    --domains="$CERT_DOMAINS"

log "HTTPS frontend (443)"
gcloud compute target-https-proxies describe eul-https-proxy --global >/dev/null 2>&1 \
  || gcloud compute target-https-proxies create eul-https-proxy --global \
    --url-map="$LB_NAME" --ssl-certificates=eul-cert
gcloud compute forwarding-rules describe eul-https --global >/dev/null 2>&1 \
  || gcloud compute forwarding-rules create eul-https --global --load-balancing-scheme=EXTERNAL_MANAGED \
    --address=eul-lb-ip --target-https-proxy=eul-https-proxy --ports=443

log "HTTP (80) → HTTPS redirect"
if ! gcloud compute url-maps describe eul-http-redirect --global >/dev/null 2>&1; then
  REDIRECT_FILE=$(mktemp)
  printf 'name: eul-http-redirect\ndefaultUrlRedirect:\n  httpsRedirect: true\n  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT\n' >"$REDIRECT_FILE"
  gcloud compute url-maps import eul-http-redirect --global --source="$REDIRECT_FILE" --quiet
  rm -f "$REDIRECT_FILE"
fi
gcloud compute target-http-proxies describe eul-http-proxy --global >/dev/null 2>&1 \
  || gcloud compute target-http-proxies create eul-http-proxy --global --url-map=eul-http-redirect
gcloud compute forwarding-rules describe eul-http --global >/dev/null 2>&1 \
  || gcloud compute forwarding-rules create eul-http --global --load-balancing-scheme=EXTERNAL_MANAGED \
    --address=eul-lb-ip --target-http-proxy=eul-http-proxy --ports=80

log "Close the run.app URLs: only the load balancer may reach the public services"
for S in eul-web eul-api eul-dashboard; do
  gcloud run services update "$S" --region="$REGION" --ingress=internal-and-cloud-load-balancing --quiet >/dev/null
  ok "$S"
done

cat <<EOF

────────────────────────────────────────────────────────────────────────
Add these records in Cloudflare → ${BASE_DOMAIN} → DNS → Records
(DNS lives at Cloudflare since November 2026, D-19; the domain stays registered at Hostinger):

  Type  Name                         IPv4 address      Proxy status
$(for H in $(echo "$CERT_DOMAINS" | tr ',' ' '); do N="${H%.${BASE_DOMAIN}}"; [ "$H" = "$BASE_DOMAIN" ] && N="@"; printf '  A     %-28s %-17s DNS only (grey cloud)\n' "$N" "$IP"; done)

• DNS only is required: Google issues and renews the certificate only while the names point
  straight at this IP. Never switch these to Proxied (orange cloud).
• Delete any OTHER A/AAAA/CNAME records with these names.
• Do NOT touch MX, TXT (SPF, DKIM, DMARC) or the Hostinger mail records: staff email keeps working.
• The certificate turns ACTIVE 15–60 minutes after DNS resolves. Check with:
    gcloud compute ssl-certificates describe eul-cert --global --format='value(managed.status,managed.domainStatus)'
────────────────────────────────────────────────────────────────────────
EOF
