#!/bin/bash

# Production startup script for Sakinah monorepo
# Optimized for Replit environment
# Starts both API backend and Next.js frontend

set -e  # Exit on error

echo "🚀 Starting Sakinah production servers for Replit..."

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${REPO_ROOT}"

# Cleanup function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "✅ Cleanup complete"
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Check if .env file exists
if [ ! -f .env ] && [ ! -f apps/api/.env ]; then
    echo "⚠️  Warning: No .env file found. Make sure environment variables are set in Replit Secrets."
fi

# Ensure dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Build the project
echo "🔨 Building project..."
npm run build || {
    echo "❌ Build failed. Check the output above for errors."
    exit 1
}

# Check if API build exists, if not use tsx to run TypeScript directly
if [ ! -f "${REPO_ROOT}/apps/api/dist/index.js" ]; then
    echo "⚠️  API build not found, will run from TypeScript source using tsx"
    API_START_CMD="npx tsx src/index.ts"
else
    echo "✅ API build found at dist/index.js"
    API_START_CMD="node dist/index.js"
fi

# Start API server in background
echo "🌐 Starting API server on port 3001..."
(cd "${REPO_ROOT}/apps/api" && PORT=3001 $API_START_CMD) > "${REPO_ROOT}/api.log" 2>&1 &
API_PID=$!
echo "   API server PID: $API_PID"

# Wait for API to be ready
echo "⏳ Waiting for API to initialize..."
sleep 5

# Check if API is actually running
if ! kill -0 $API_PID 2>/dev/null; then
    echo "❌ API server failed to start. Check api.log:"
    tail -20 "${REPO_ROOT}/api.log"
    exit 1
fi
echo "✅ API server is running"

# Start Next.js frontend on port 5000 (mapped to external 80)
echo "🌐 Starting Next.js frontend on port 5000..."
# In Replit, use 0.0.0.0 to accept connections from the proxy
(cd "${REPO_ROOT}/apps/ui" && PORT=5000 HOST=0.0.0.0 npx next start -p 5000 -H 0.0.0.0) > "${REPO_ROOT}/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "   Frontend server PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to initialize..."
sleep 5

# Check if frontend is actually running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend server failed to start. Check frontend.log:"
    tail -20 "${REPO_ROOT}/frontend.log"
    exit 1
fi
echo "✅ Frontend server is running"

echo ""
echo "✨ Both servers started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 API:      http://localhost:3001  (PID: $API_PID)"
echo "  🖥️  Frontend: http://localhost:5000  (PID: $FRONTEND_PID)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Logs:"
echo "   API:      tail -f api.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Keep the script running and monitor both processes
while true; do
    # Check if API is still running
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "❌ API server stopped unexpectedly. Check api.log"
        tail -20 "${REPO_ROOT}/api.log"
        exit 1
    fi

    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend server stopped unexpectedly. Check frontend.log"
        tail -20 "${REPO_ROOT}/frontend.log"
        exit 1
    fi

    sleep 10
done
