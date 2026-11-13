# Build from the repo root:  docker build -f apps/api/Dockerfile -t eul-api .
FROM node:22-slim AS base
WORKDIR /app

FROM base AS prune
COPY . .
RUN npx --yes turbo@^2 prune @eul/api --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN npm ci
COPY --from=prune /app/out/full/ .
RUN npx turbo run build --filter=@eul/api

FROM base AS run
ENV NODE_ENV=production PORT=8080
COPY --from=build /app .
USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/main.js"]
