# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Start both frontend and backend in development mode
npm run dev

# Build all packages (frontend, backend, shared types)
npm run build

# Run type checking across all packages
npm run type-check

# Lint all code
npm run lint

# Format all code
npm run format

# Clean build artifacts
npm run clean
```

### Individual Package Commands
```bash
# Frontend (Next.js) - from apps/web/
npm run dev          # Start dev server on :3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Next.js linting
npm run type-check   # TypeScript check only

# Backend (Express API) - from apps/api/
npm run dev          # Start dev server with tsx watch on :3001
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled JS
npm run test         # Run Vitest tests
npm run lint         # ESLint for API code

# Shared Types - from packages/types/
npm run build        # Compile TypeScript definitions
```

## Architecture Overview

### Monorepo Structure
This is a **Modular Monolith** with **Clean Architecture** using Turborepo for orchestration:

- `apps/web/` - Next.js 14 frontend with App Router
- `apps/api/` - Express.js backend with Clean Architecture layers
- `packages/types/` - Shared TypeScript types and Zod schemas

### Backend Architecture (Clean Architecture)
The API follows strict Clean Architecture with these layers:

```
src/
├── application/     # Use cases (business logic)
├── domain/          # Entities and interfaces (future)
├── infrastructure/  # External adapters
│   ├── ai/         # AI providers (Rules/LLM with factory pattern)
│   ├── auth/       # Supabase JWT middleware
│   ├── db/         # Supabase client
│   └── repos/      # Repository implementations
├── routes/         # HTTP route handlers
└── shared/         # Utilities (errors, logger, result types)
```

**Key Patterns:**
- **Repository Pattern**: All database access through repositories
- **Factory Pattern**: AI provider switching via `AI_PROVIDER` env var
- **Result Pattern**: Error handling with `Result<T, E>` type
- **Dependency Injection**: Services injected into use cases

### Frontend Architecture (MVVM)
Next.js app using feature-based MVVM pattern:

```
app/
├── (auth)/         # Auth route group
├── dashboard/      # Dashboard with client component
├── tazkiyah/       # Spiritual plan creation
├── habits/         # Habit tracking
├── checkin/        # Daily muhasabah (self-accountability)
└── journal/        # Spiritual journaling

lib/
├── api.ts          # API client wrapper
├── supabase-browser.ts  # Client-side Supabase
└── supabase-server.ts   # Server-side Supabase
```

### Authentication Flow
- **Supabase Auth** with magic link (passwordless)
- **JWT verification** in Express middleware
- **Row Level Security** (RLS) in database
- **Server Actions** in Next.js call Express API with JWT

### AI System Architecture
Pluggable AI providers via factory pattern:

- **RulesAiProvider** (default): Tag-based matching to curated Islamic content
- **LlmAiProvider**: OpenAI integration (env-gated)
- Switch via `AI_PROVIDER=rules|llm` environment variable

## Database Setup

### Supabase Configuration
1. Create Supabase project
2. Run migration: `supabase/migrations/001_initial_schema.sql`
3. Seed content: `supabase/seed.sql`
4. Configure RLS policies (included in migration)

### Key Tables
- **content_snippets**: Quranic verses, Hadith, duas (tagged)
- **plans**: Tazkiyah plans (takhliyah/tahliyah)
- **habits**: User habits with streak tracking
- **habit_completions**: Daily completion records
- **checkins**: Daily muhasabah entries
- **journals**: Spiritual journal entries

## Environment Configuration

### Quick Start (No Configuration Needed!)
```bash
# Just run this command - no environment setup required!
npm run dev
```
The application automatically uses SQLite for local development with mock authentication.

### Advanced Configuration (Optional)
```bash
# API Configuration (optional - has sensible defaults)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:3000

# AI Provider (optional - defaults to rules-based)
AI_PROVIDER=rules               # or 'llm'
OPENAI_API_KEY=                 # only needed if using 'llm'

# Database Override (optional - auto-detected)
DB_BACKEND=sqlite               # or 'supabase'

# Supabase (only needed for production or if USE_SUPABASE=true)
USE_SUPABASE=true               # enable Supabase in development
NEXT_PUBLIC_USE_SUPABASE=true   # enable Supabase on frontend
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # API only
SUPABASE_JWT_SECRET=            # API only
```

### Development Modes

1. **Local SQLite Mode (Default)**
   - No configuration required
   - Automatic SQLite database with mock authentication
   - Perfect for development and testing
   ```bash
   npm run dev  # That's it!
   ```

2. **Supabase Mode (Optional)**
   - For testing with real authentication
   - Set `USE_SUPABASE=true` and provide Supabase credentials
   ```bash
   USE_SUPABASE=true npm run dev
   ```

## Core Features Implementation

### Tazkiyah Engine
- **Takhliyah**: Purification from spiritual diseases (envy, anger, pride)
- **Tahliyah**: Building virtues (patience, gratitude, tawakkul)
- AI suggests micro-habits + Islamic content based on user input

### Spiritual Content System
- Admin-seeded Quranic verses, Hadith, duas
- Tagged by spiritual themes (envy, patience, tawakkul, etc.)
- Content recommendations based on user's spiritual goals

### Privacy-First Design
- No social features or public profiles
- All data private by default
- No tracking beyond essential functionality
- RLS enforces data isolation per user

## Deployment

### Vercel Deployment
- **Frontend**: Deploy `apps/web/` as standard Next.js app
- **Backend**: Deploy `apps/api/` as Vercel Functions
- Both apps deployed separately with shared environment variables

### Build Notes
- Build may fail during static generation without environment variables (expected)
- All TypeScript compilation and linting must pass
- ESLint configured to allow Islamic content with quotes/apostrophes