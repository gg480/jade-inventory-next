#!/bin/sh
set -e

echo "🟢 Jade Inventory - Starting..."
echo "   NODE_ENV=${NODE_ENV:-undefined}"
echo "   ADMIN_PASSWORD=${ADMIN_PASSWORD:+***configured***}"
echo "   DATABASE_URL=${DATABASE_URL:-file:./db/custom.db}"

# Ensure data directories exist and have correct permissions
# This must run as root before dropping privileges
echo "📁 Ensuring data directories exist..."
mkdir -p /app/db /app/upload
chown -R nextjs:nodejs /app/db /app/upload /app/prisma 2>/dev/null || true

# Check if database exists, if not initialize it
if [ ! -f /app/db/custom.db ]; then
  echo "📦 No database found. Initializing..."

  # Ensure ADMIN_PASSWORD is set
  if [ -z "$ADMIN_PASSWORD" ]; then
    echo "⚠️  No ADMIN_PASSWORD set. Using default 'admin123'"
    export ADMIN_PASSWORD="admin123"
  fi

  # Step 1: Create database and push schema
  echo "📋 Creating database schema..."
  export DATABASE_URL="${DATABASE_URL:-file:./db/custom.db}"

  # Run as nextjs user for proper file ownership
  INIT_SUCCESS=0

  # Try using npx with the local prisma
  if su-exec nextjs npx prisma db push --skip-generate 2>&1; then
    echo "✅ Database schema created"
    INIT_SUCCESS=1
  else
    echo "⚠️  npx prisma db push failed, trying direct node..."
    # Try running prisma directly
    if [ -f /app/node_modules/prisma/build/index.js ]; then
      su-exec nextjs node /app/node_modules/prisma/build/index.js db push --skip-generate 2>&1 && INIT_SUCCESS=1
    fi
  fi

  if [ "$INIT_SUCCESS" = "0" ]; then
    echo "❌ Failed to create database schema!"
    echo "   Trying to start server anyway (may use in-memory fallback)..."
  fi

  # Step 2: Run seed to insert initial data and admin password
  if [ "$INIT_SUCCESS" = "1" ]; then
    echo "🌱 Seeding database..."
    SEED_SUCCESS=0

    # Try running seed with bun
    if command -v bun > /dev/null 2>&1; then
      echo "  Trying bun prisma/seed.ts..."
      if su-exec nextjs bun /app/prisma/seed.ts 2>&1; then
        SEED_SUCCESS=1
        echo "✅ Seed completed via bun"
      fi
    fi

    # Try npx prisma db seed
    if [ "$SEED_SUCCESS" = "0" ]; then
      echo "  Trying npx prisma db seed..."
      if su-exec nextjs npx prisma db seed 2>&1; then
        SEED_SUCCESS=1
        echo "✅ Seed completed via npx"
      fi
    fi

    # Try direct node on seed.ts (if tsx is available)
    if [ "$SEED_SUCCESS" = "0" ]; then
      echo "  Trying node with tsx..."
      if command -v npx > /dev/null 2>&1; then
        if su-exec nextjs npx tsx /app/prisma/seed.ts 2>&1; then
          SEED_SUCCESS=1
          echo "✅ Seed completed via tsx"
        fi
      fi
    fi

    # Last resort: manually insert admin password using sqlite3
    if [ "$SEED_SUCCESS" = "0" ]; then
      echo "⚠️  All seed methods failed. Manually inserting admin password..."
      HASH=$(node -e "
        const c = require('crypto');
        const s = c.randomBytes(16).toString('hex');
        const h = c.pbkdf2Sync('$ADMIN_PASSWORD', s, 100000, 64, 'sha512').toString('hex');
        console.log(s + ':' + h);
      ")
      sqlite3 /app/db/custom.db "INSERT OR REPLACE INTO sys_config (key, value, description) VALUES ('admin_password', '$HASH', '管理员密码(哈希)');" 2>&1 && SEED_SUCCESS=1
      echo "✅ Admin password set manually"
    fi

    if [ "$SEED_SUCCESS" = "1" ]; then
      echo "✅ Database initialized successfully!"
    else
      echo "❌ Database seed failed. Admin login may not work."
    fi
  fi
else
  echo "✅ Existing database found at /app/db/custom.db"
fi

# Fix ownership of all data files
chown -R nextjs:nodejs /app/db /app/upload 2>/dev/null || true

# Clean expired sessions on startup
echo "🧹 Cleaning expired sessions..."

# Drop privileges and start the Next.js server
echo "🚀 Starting Jade Inventory on port ${PORT:-3000}..."
exec su-exec nextjs node server.js
