# syntax=docker/dockerfile:1.7
# Multi-stage build for @argos/web (Next.js 15 + Prisma, pnpm monorepo).
# Produces a ~250MB image from Next.js standalone output.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable
WORKDIR /app

# ---- deps: install workspace dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/cli/package.json ./packages/cli/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
COPY packages/web/prisma ./packages/web/prisma
RUN pnpm install --frozen-lockfile

# ---- builder: prisma generate + build shared + build web ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/cli/node_modules ./packages/cli/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# @argos/shared declares `main: dist/index.js`, so it must be built before the
# web app can resolve it. `transpilePackages` transforms the source at Next.js
# build time but webpack still needs a valid entry point (dist/index.js) to
# start from.
RUN pnpm --filter @argos/shared build

# Prisma client generation (uses schema only, no DB connection needed).
RUN pnpm --filter @argos/web exec prisma generate

# Build-time CI-style placeholders for env vars that are validated at build but
# never used at build-time (AUTH_SECRET / JWT_SECRET / DATABASE_URL). The real
# values are injected at runtime via .env.production.
ARG AUTH_SECRET=placeholder-build-time-only-32-characters-long
ARG JWT_SECRET=placeholder-build-time-only-32-characters-long
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ARG DIRECT_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ARG NEXT_PUBLIC_SITE_URL=https://argos.abada.co.kr
ENV AUTH_SECRET=$AUTH_SECRET
ENV JWT_SECRET=$JWT_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN pnpm --filter @argos/web build

# ---- runner: minimal production image ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# Next.js standalone output (monorepo-aware layout via outputFileTracingRoot).
# The standalone bundle contains hoisted node_modules + the minimal app tree.
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/public ./packages/web/public

# Prisma runtime: schema for `migrate deploy`. The Prisma Client itself is
# bundled by Next.js standalone output (imported from app code). The Prisma CLI
# binary (for migrations) is installed globally below since pnpm's `.pnpm`
# hoisting makes direct COPY paths unreliable across stages.
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/prisma ./packages/web/prisma

# Install the Prisma CLI globally so `npx prisma migrate deploy` works at runtime.
# Version must match the `prisma` devDependency in packages/web/package.json.
RUN npm install -g prisma@6

USER nextjs
EXPOSE 3000

CMD ["node", "packages/web/server.js"]
