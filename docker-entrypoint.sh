#!/bin/sh
set -e

echo "🟢 Jade Inventory - Starting..."
echo "   NODE_ENV=${NODE_ENV:-undefined}"
echo "   ADMIN_PASSWORD=${ADMIN_PASSWORD:+***configured***}"
echo "   DATABASE_URL=${DATABASE_URL:-file:./db/custom.db}"

# Ensure data directories exist and have correct permissions
mkdir -p /app/db /app/upload
chown -R nextjs:nodejs /app/db /app/upload 2>/dev/null || true

# Database initialization is handled by Next.js instrumentation.ts
# (src/instrumentation.ts → src/lib/db-init.ts)
# This ensures DB init works even when npx/bun/prisma CLI are not available.

# Drop privileges and start the Next.js server
echo "🚀 Starting Jade Inventory on port ${PORT:-3000}..."
echo "   (Database will auto-initialize on first request if needed)"
exec su-exec nextjs node server.js
