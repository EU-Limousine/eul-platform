# Build from the repo root:  docker build -f apps/dashboard/Dockerfile -t eul-dashboard .
FROM node:22-slim AS prune
WORKDIR /app
COPY . .
RUN npx --yes turbo@^2 prune @eul/dashboard --docker

FROM node:22-slim AS build
WORKDIR /app
COPY --from=prune /app/out/json/ .
RUN npm ci
COPY --from=prune /app/out/full/ .
RUN npx turbo run build --filter=@eul/dashboard

FROM nginx:1.27-alpine AS run
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/dashboard/security-headers.conf /etc/nginx/security-headers.conf
COPY --chmod=755 apps/dashboard/40-config.sh /docker-entrypoint.d/40-config.sh
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 8080
