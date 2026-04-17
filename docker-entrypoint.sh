#!/bin/sh
set -e

echo "🟢 Jade Inventory - Starting..."
echo "   NODE_ENV=${NODE_ENV:-undefined}"
echo "   ADMIN_PASSWORD=${ADMIN_PASSWORD:+***configured***}"

# Ensure data directories exist and have correct permissions
mkdir -p /app/db /app/upload
chown -R nextjs:nodejs /app/db /app/upload 2>/dev/null || true

# Ensure DATABASE_URL uses absolute path (required for standalone mode)
# If user provides relative path, convert it
case "${DATABASE_URL}" in
  file:/*)
    # Already absolute path — good
    ;;
  file:.*)
    # Relative path — convert to absolute
    REL_PATH="${DATABASE_URL#file:}"
    ABS_PATH="$(cd /app && realpath -m "$REL_PATH" 2>/dev/null || echo "/app/$REL_PATH")"
    export DATABASE_URL="file:$ABS_PATH"
    echo "   DATABASE_URL converted to absolute: $DATABASE_URL"
    ;;
  *)
    # Default
    export DATABASE_URL="file:/app/db/custom.db"
    echo "   DATABASE_URL set to default: $DATABASE_URL"
    ;;
esac

# Database initialization is handled by Next.js instrumentation.ts
# (src/instrumentation.ts → src/lib/db-init.ts)

# Drop privileges and start the Next.js server
echo "🚀 Starting Jade Inventory on port ${PORT:-3000}..."
echo "   (Database will auto-initialize on first request if needed)"
exec su-exec nextjs node server.js
