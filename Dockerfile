# ============================================================
# Multi-stage Dockerfile for Jade Inventory (翡翠珠宝进销存)
# Production-optimized with standalone Next.js output
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

# Install bun for seed script runtime + sqlite tools
RUN apk add --no-cache sqlite && \
    npm install -g bun prisma

# Security: run as non-root user
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

# Copy Prisma schema for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directories with proper ownership
RUN mkdir -p /app/db /app/upload && \
    chown -R nextjs:nodejs /app/db /app/upload /app/prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats/quick || exit 1

# Data volumes
VOLUME ["/app/db", "/app/upload"]

# Entry point handles DB init on first run
ENTRYPOINT ["/app/docker-entrypoint.sh"]
