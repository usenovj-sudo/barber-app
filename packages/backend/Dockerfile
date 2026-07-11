# ─── Builder: install all deps, generate Prisma client, compile ──────────────
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# Copy workspace manifests first for better layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Copy sources and build
COPY packages/shared packages/shared
COPY packages/backend packages/backend
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend build
# Compile the seed script so the prod image can run `node prisma/seed.js`
RUN pnpm --filter backend exec tsc prisma/seed.ts --outDir prisma --module commonjs --esModuleInterop --skipLibCheck

# Produce a self-contained deploy bundle (flat node_modules, prod deps only).
# --legacy: pnpm 10 requires it for non-injected workspace deploys.
RUN pnpm --filter backend deploy --legacy --prod /app

# The deploy bundle has a fresh node_modules without the generated Prisma
# client (.prisma/client) — regenerate it inside the bundle.
RUN cd /app && node_modules/.bin/prisma generate

# ─── Runtime: minimal image with just the bundle ─────────────────────────
FROM node:20-slim AS runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
# Apply migrations, then start the API
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
