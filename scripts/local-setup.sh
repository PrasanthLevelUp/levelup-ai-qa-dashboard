#!/bin/bash
# LevelUp AI QA Dashboard - Local Setup Script
# Run this after cloning: chmod +x scripts/local-setup.sh && ./scripts/local-setup.sh

set -e
echo "🎯 LevelUp AI QA Dashboard - Local Setup"
echo "========================================="

# Step 1: Use standalone package.json
if [ -L "package.json" ] || grep -q "hostedapp" package.json 2>/dev/null; then
  echo "📦 Setting up standalone package.json..."
  cp package.standalone.json package.json
fi

# Step 2: Fix Prisma schema for local development
echo "🔧 Fixing Prisma schema for local development..."
# Remove hardcoded output path (only needed for hosted environment)
sed -i.bak '/output.*=.*"\/home\/ubuntu/d' prisma/schema.prisma
rm -f prisma/schema.prisma.bak

# Step 3: Check for .env file
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file..."
  echo '# Choose ONE database option:' > .env
  echo '' >> .env
  echo '# Option A: SQLite (easiest - no database install needed)' >> .env
  echo '# First change provider in prisma/schema.prisma from "postgresql" to "sqlite"' >> .env
  echo '# DATABASE_URL="file:./dev.db"' >> .env
  echo '' >> .env
  echo '# Option B: PostgreSQL' >> .env
  echo '# DATABASE_URL="postgresql://user:password@localhost:5432/levelup_qa_dashboard"' >> .env
  echo '' >> .env
  echo "⚠️  Please edit .env and uncomment ONE DATABASE_URL option"
  echo "   For SQLite: also change 'postgresql' to 'sqlite' in prisma/schema.prisma"
  exit 1
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
npx ts-node scripts/seed.ts

echo ""
echo "✅ Setup complete! Run: npm run dev"
echo "🌐 Open: http://localhost:3000"
