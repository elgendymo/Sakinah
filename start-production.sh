#!/bin/bash

# Production startup script for Sakinah monorepo
# Starts both API backend and Next.js frontend

echo "Starting Sakinah production servers..."

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cleanup function to kill both processes on exit
cleanup() {
    echo "Shutting down servers..."
    kill $API_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start API server in background
echo "Starting API server on port 3001..."
cd "${REPO_ROOT}/apps/api" && PORT=3001 npm start &
API_PID=$!

# Wait a bit for API to initialize
sleep 3

# Start Next.js frontend on port 5000 (forwards to external port 80)
echo "Starting Next.js frontend on port 5000..."
cd "${REPO_ROOT}/apps/ui" && PORT=5000 npm start &
FRONTEND_PID=$!

echo "Both servers started:"
echo "  - API: PID $API_PID (port 3001)"
echo "  - Frontend: PID $FRONTEND_PID (port 5000 -> external 80)"

# Wait for either process to exit
wait -n || cleanup

# If we get here, one process exited - cleanup and exit
cleanup
