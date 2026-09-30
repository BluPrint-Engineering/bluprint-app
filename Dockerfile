# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
COPY --from=oven/bun:1.4.0-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

FROM base AS build
RUN bun install --frozen-lockfile --ignore-scripts --filter @bluprint/api
COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN bun run --filter @bluprint/shared build \
 && bun run --filter @bluprint/api build

FROM base AS prod-deps
# without --omit peer, Bun also installs better-auth's optional peers (vite, drizzle-kit, ...): ~180 MB the API never loads
RUN bun install --frozen-lockfile --ignore-scripts --production --omit peer --filter @bluprint/api

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/package.json package.json
COPY --from=prod-deps /app/apps/api/node_modules apps/api/node_modules
COPY --from=prod-deps /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/drizzle apps/api/drizzle
WORKDIR /app/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
