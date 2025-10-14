#!/bin/bash

# Sakinah Survey Testing Script
# This script sets up mock authentication for testing the survey flow

set -e

echo "🕌 Sakinah Survey Testing Setup"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    print_error "Please run this script from the root directory of the Sakinah project"
    exit 1
fi

# Clean up any existing processes on ports
print_info "Cleaning up existing processes..."
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :3002 2>/dev/null | xargs kill -9 2>/dev/null || true

# Remove old database for fresh start
if [ -f "apps/api/sakinah.db" ]; then
    print_info "Removing old database for fresh start..."
    rm -f apps/api/sakinah.db
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
fi

print_status "Starting Sakinah with Mock Authentication..."

# Set environment variables for mock auth
export DB_BACKEND=sqlite
export NODE_ENV=development
export NEXT_PUBLIC_API_URL=http://localhost:3001/api
export USE_MOCK_AUTH=true

print_info "Environment configured:"
echo "  - Database: SQLite (mock auth enabled)"
echo "  - API URL: http://localhost:3001/api"
echo "  - Frontend: http://localhost:3000"
echo ""

# Start the development servers
print_info "Starting development servers..."
echo ""
print_warning "Press Ctrl+C to stop all servers"
echo ""

# Start with proper environment
npm run dev

echo ""
print_status "Servers stopped. Cleanup completed."