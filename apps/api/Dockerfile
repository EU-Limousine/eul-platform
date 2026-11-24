# Backend image: API + worker + migration/seed jobs (one image, different start commands).
# Build from the repo root:  docker build -f apps/api/Dockerfile -t backend .
#   API:     node apps/api/dist/main.js            (default)
#   Worker:  node apps/worker/dist/main.js
#   Jobs:    npm run migrate:deploy -w @eul/db  /  npm run seed -w @eul/db
FROM node:22-slim AS base
# Prisma's migration engine needs OpenSSL; the slim image does not include it.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS prune
COPY . .
RUN npx --yes turbo@^2 prune @eul/api @eul/worker --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN npm ci
COPY --from=prune /app/out/full/ .
RUN npx turbo run build --filter=@eul/api --filter=@eul/worker

FROM base AS run
ENV NODE_ENV=production PORT=8080
COPY --from=build /app .
USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/main.js"]
