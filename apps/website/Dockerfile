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
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx turbo run build --filter=@eul/website

FROM base AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/website/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=build --chown=node:node /app/apps/website/public ./apps/website/public
USER node
EXPOSE 8080
CMD ["node", "apps/website/server.js"]
