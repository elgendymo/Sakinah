#!/bin/bash
# Vercel Build Optimization Script

echo "🔧 Optimizing build for Vercel deployment..."

# Set memory optimization
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf apps/ui/.next
rm -rf apps/ui/out
rm -rf node_modules/.cache

# Install dependencies with optimization
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit --no-fund

# Build packages in correct order
echo "🔨 Building packages..."

# Build types first
cd packages/types
npm run build
cd ../..

# Build UI components
cd packages/ui
npm run build
cd ../..

# Build main app
echo "🚀 Building main application..."
cd apps/ui
npm run build

echo "✅ Build optimization complete!"
