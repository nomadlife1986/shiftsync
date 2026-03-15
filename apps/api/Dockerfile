# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy manifests only (for layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/shared-types/package.json packages/shared-types/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Generate Prisma client & build ───────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY . .

# Generate Prisma client (schema only, no DB connection needed)
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shiftsync?schema=public
RUN cd packages/database && npx prisma generate --schema=prisma/schema.prisma

# Compile TypeScript
RUN cd apps/api && pnpm build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy manifests for prod install
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/shared-types/package.json packages/shared-types/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled output and generated Prisma client
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/shared-types ./packages/shared-types

EXPOSE 3002

CMD ["node", "apps/api/dist/main.js"]
