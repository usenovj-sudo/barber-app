# ─── Builder: compile the Vite SPA ───────────────────────────────────────────
FROM node:20-slim AS builder
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/admin/package.json packages/admin/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY packages/admin packages/admin

# API base URL is baked in at build time (Vite env)
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @cafe/admin build

# ─── Runtime: serve static files via nginx ───────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY packages/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/packages/admin/dist /usr/share/nginx/html
EXPOSE 80
