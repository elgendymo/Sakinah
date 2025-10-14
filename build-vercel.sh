#!/bin/bash

# Vercel Build Script for Sakinah
set -e

echo "🚀 Starting Vercel build process for Sakinah..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf apps/ui/.next
rm -rf apps/ui/out
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Build types package
echo "🔧 Building types package..."
cd packages/types
npm run build
cd ../..

# Build UI package
echo "🎨 Building UI package..."
cd packages/ui
npm run build
cd ../..

# Build API
echo "🔌 Building API..."
cd apps/api
npm run build
cd ../..

# Build main UI app
echo "🌐 Building main UI application..."
cd apps/ui

# Set environment for production
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Build with timeout
timeout 300 npm run build || {
    echo "❌ Build timed out after 5 minutes"
    exit 1
}

echo "✅ Build completed successfully!"
echo "📁 Build output located in apps/ui/.next"

# Verify build output
if [ -d ".next" ]; then
    echo "✅ Next.js build output verified"
    ls -la .next/
else
    echo "❌ No build output found"
    exit 1
fi

cd ../..

echo "🎉 Vercel build preparation complete!"
echo "📋 Next steps:"
echo "   1. Run 'vercel deploy' to deploy to Vercel"
echo "   2. Or push to your connected Git repository for automatic deployment"
