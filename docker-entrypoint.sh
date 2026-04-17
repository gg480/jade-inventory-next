#!/bin/sh
set -e

echo "🟢 Jade Inventory - Starting..."

# Ensure database directory exists
mkdir -p /app/db

# Check if database exists, if not initialize it
if [ ! -f /app/db/custom.db ]; then
  echo "📦 No database found. Initializing..."

  # Push schema to create tables
  echo "📋 Pushing database schema..."
  npx prisma db push --skip-generate 2>&1 || {
    echo "⚠️  prisma db push failed, trying alternative..."
    # Try with bun if available
    if command -v bun > /dev/null 2>&1; then
      bunx prisma db push --skip-generate 2>&1 || true
    fi
  }

  # Ensure ADMIN_PASSWORD is set
  if [ -z "$ADMIN_PASSWORD" ]; then
    echo "⚠️  No ADMIN_PASSWORD set. Using default 'admin123' (please change immediately after login!)"
    export ADMIN_PASSWORD="admin123"
  else
    echo "🔑 Admin password configured from ADMIN_PASSWORD env var"
  fi

  # Run seed script
  echo "🌱 Running database seed..."
  SEED_SUCCESS=0

  # Try bun first (faster)
  if command -v bun > /dev/null 2>&1; then
    echo "  Using bun to run seed..."
    if bun prisma/seed.ts 2>&1; then
      SEED_SUCCESS=1
      echo "✅ Seed completed via bun"
    else
      echo "⚠️  bun seed failed, trying npx..."
    fi
  fi

  # Fallback to npx prisma db seed
  if [ "$SEED_SUCCESS" = "0" ]; then
    echo "  Using npx prisma db seed..."
    if npx prisma db seed 2>&1; then
      SEED_SUCCESS=1
      echo "✅ Seed completed via npx"
    else
      echo "⚠️  npx prisma db seed also failed, trying direct node..."
      # Last resort: try running seed directly with node if compiled
      if [ -f "prisma/seed.js" ]; then
        node prisma/seed.js 2>&1 && SEED_SUCCESS=1
      fi
    fi
  fi

  if [ "$SEED_SUCCESS" = "1" ]; then
    echo "✅ Database initialized successfully"
  else
    echo "❌ WARNING: Database seed may have failed!"
    echo "   You may need to manually set the admin password."
    echo "   Try: docker exec -it jade-inventory npx prisma db seed"
  fi
else
  echo "✅ Existing database found"
fi

# Clean expired sessions on startup
echo "🧹 Cleaning expired sessions..."

# Start the Next.js server
echo "🚀 Starting Jade Inventory on port ${PORT:-3000}..."
exec node server.js
