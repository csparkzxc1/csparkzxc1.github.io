# syntax=docker/dockerfile:1.7
# Multi-stage build for the @study-room/api workspace. The repo uses npm
# workspaces rooted at study_room_app, so we copy that whole subtree.

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --workspaces --include-workspace-root

FROM deps AS build
COPY apps/api ./apps/api
RUN npx --workspace apps/api prisma generate
RUN npm run build --workspace apps/api

FROM base AS runtime
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json ./apps/api/package.json
COPY package.json ./package.json
USER app
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
