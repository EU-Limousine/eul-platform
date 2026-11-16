# Build from the repo root:  docker build -f apps/website/Dockerfile -t eul-web .
FROM node:22-slim AS base
WORKDIR /app

FROM base AS prune
COPY . .
RUN npx --yes turbo@^2 prune @eul/website --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN npm ci
COPY --from=prune /app/out/full/ .
# Public values are baked into the build by Next.js. Never pass secrets here.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DEFAULT_CURRENCY=EUR
ARG NEXT_PUBLIC_MAPS_WEB_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_DEFAULT_CURRENCY=$NEXT_PUBLIC_DEFAULT_CURRENCY \
    NEXT_PUBLIC_MAPS_WEB_KEY=$NEXT_PUBLIC_MAPS_WEB_KEY \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    SITE_URL=$SITE_URL
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "Build arg NEXT_PUBLIC_API_URL is required" && exit 1)
RUN npx turbo run build --filter=@eul/website

FROM base AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/website/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=build --chown=node:node /app/apps/website/public ./apps/website/public
USER node
EXPOSE 8080
CMD ["node", "apps/website/server.js"]
