#!/bin/bash
# LevelUp AI QA Dashboard - Local Setup Script
# Run this after cloning: chmod +x scripts/local-setup.sh && ./scripts/local-setup.sh

set -e
echo "🎯 LevelUp AI QA Dashboard - Local Setup"
echo "========================================="

# Step 1: Use standalone package.json (always overwrite for local dev)
echo "📦 Setting up standalone package.json..."
cp package.standalone.json package.json
rm -rf node_modules package-lock.json

# Step 2: Fix Prisma schema for local development
echo "🔧 Fixing Prisma schema for local development..."
# Remove hardcoded output path (only needed for hosted environment)
if grep -q '/home/ubuntu' prisma/schema.prisma 2>/dev/null; then
  sed -i.bak '/output.*=.*"\/home\/ubuntu/d' prisma/schema.prisma
  rm -f prisma/schema.prisma.bak
  echo "   ✅ Removed hardcoded output path"
fi

# Step 3: Choose database
if [ ! -f ".env" ]; then
  echo ""
  echo "📦 Choose your database:"
  echo "  1) SQLite  (easiest - no install needed) ⭐ Recommended"
  echo "  2) PostgreSQL (production-like)"
  echo ""
  read -p "Enter choice [1/2] (default: 1): " DB_CHOICE
  DB_CHOICE=${DB_CHOICE:-1}

  if [ "$DB_CHOICE" = "2" ]; then
    read -p "Enter PostgreSQL URL [postgresql://localhost:5432/levelup_qa]: " PG_URL
    PG_URL=${PG_URL:-postgresql://localhost:5432/levelup_qa}
    echo "DATABASE_URL=\"$PG_URL\"" > .env
    echo "   ✅ Using PostgreSQL: $PG_URL"
  else
    # Switch Prisma provider to SQLite
    sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
    rm -f prisma/schema.prisma.bak
    # Remove @@index directives that SQLite handles differently
    echo 'DATABASE_URL="file:./dev.db"' > .env
    echo "   ✅ Using SQLite (file:./dev.db)"
  fi
else
  echo "   .env file already exists, checking database provider..."
  # Auto-detect: if DATABASE_URL starts with "file:" → ensure schema says sqlite
  if grep -q 'file:' .env 2>/dev/null; then
    if grep -q 'provider = "postgresql"' prisma/schema.prisma 2>/dev/null; then
      echo "   🔧 Switching Prisma provider to SQLite (matches your DATABASE_URL)..."
      sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
      rm -f prisma/schema.prisma.bak
    fi
  fi
fi

# Step 4: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 5: Generate Prisma client and push schema
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push

# Step 6: Seed demo data
echo "🌱 Seeding demo data..."
npx tsx scripts/seed.ts

echo ""
echo "✅ Setup complete! Run: npm run dev"
echo "🌐 Open: http://localhost:3000"
