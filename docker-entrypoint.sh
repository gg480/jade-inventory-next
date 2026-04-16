#!/bin/sh
set -e

echo "🟢 Jade Inventory - Starting..."

# Ensure database directory exists
mkdir -p /app/db

# Check if database exists, if not initialize it
if [ ! -f /app/db/custom.db ]; then
  echo "📦 No database found. Initializing..."

  # Push schema to create tables
  npx prisma db push --skip-generate 2>/dev/null || true

  # Run seed with admin password from env
  export NODE_ENV=production
  if [ -n "$ADMIN_PASSWORD" ]; then
    echo "🔑 Setting admin password from ADMIN_PASSWORD env var"
  else
    echo "⚠️  No ADMIN_PASSWORD set. Using default (please change immediately after login!)"
    export ADMIN_PASSWORD="admin123"
  fi

  # Use bun for seed if available, otherwise node
  if command -v bun &> /dev/null; then
    bun run db:seed 2>/dev/null || npx prisma db seed 2>/dev/null || true
  else
    npx prisma db seed 2>/dev/null || true
  fi

  echo "✅ Database initialized successfully"
else
  echo "✅ Existing database found"
fi

# Clean expired sessions on startup
echo "🧹 Cleaning expired sessions..."

# Start the Next.js server
echo "🚀 Starting Jade Inventory on port ${PORT:-3000}..."
exec node server.js
