# ============================================================
# Multi-stage Dockerfile for Jade Inventory (翡翠珠宝进销存)
# Production-optimized with standalone Next.js output
# DB init is handled by the app itself (instrumentation.ts)
# ============================================================

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install bun and dependencies
RUN npm install -g bun && \
    bun install --frozen-lockfile && \
    bun run db:generate

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g bun

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./db/custom.db

# Build Next.js (standalone output)
RUN bun run build

# ---- Stage 3: Production Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app

# Install sqlite for debugging, su-exec for privilege management
RUN apk add --no-cache sqlite su-exec

# Security: create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and client (needed for db-init.ts at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directories
RUN mkdir -p /app/db /app/upload

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats/quick || exit 1

# Data volumes
VOLUME ["/app/db", "/app/upload"]

# Entrypoint: fix permissions then start server
# DB initialization is handled by Next.js instrumentation.ts
ENTRYPOINT ["/app/docker-entrypoint.sh"]
