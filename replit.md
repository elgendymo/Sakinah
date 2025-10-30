# Sakinah - Muslim Spiritual Growth Platform

## Overview

Sakinah is a privacy-first, Shariah-compliant web application designed for Muslim spiritual purification (tazkiyah), habit building, and righteous companionship. The platform implements classical Islamic methodology for soul purification through two core approaches:

- **Takhliyah**: Removing spiritual diseases (envy, anger, pride, greed)
- **Tahliyah**: Adorning the heart with beautiful qualities (patience, gratitude, trust in Allah)

The application provides daily rituals, habit tracking, AI-powered spiritual guidance, and a journaling system while maintaining complete user privacy and Islamic authenticity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure

The project follows a **Modular Monolith** architecture organized as a monorepo with separate packages:

- **apps/ui**: Next.js 14 frontend with App Router (port 5000)
- **apps/api**: Express.js backend API (port 3002)
- **packages/types**: Shared TypeScript type definitions
- **packages/ui**: Reusable UI component library

The rationale for this structure is to maintain code sharing and type safety across frontend and backend while allowing independent deployment of each service.

### Frontend Architecture (Next.js 14)

**Pattern**: MVVM (Model-View-ViewModel) with App Router

The frontend implements a clean separation between UI components (Views), business logic (ViewModels), and data models:

- **Views**: React components in `/app` directory using Server and Client Components
- **ViewModels**: State management using Zustand stores
- **Client-side state**: Zustand for complex state, React hooks for simple state
- **Server actions**: Direct database queries via Supabase client in Server Components

**Key decisions**:
- Next.js App Router for improved performance and SEO
- Server Components by default, Client Components only when needed for interactivity
- Optimistic UI updates for better perceived performance

### Backend Architecture (Express.js)

**Pattern**: Clean Architecture with Domain-Driven Design principles

Layered structure:
1. **Presentation Layer**: Express routes and middleware
2. **Application Layer**: Use cases coordinating business logic
3. **Domain Layer**: Entities, value objects, domain events, and business rules
4. **Infrastructure Layer**: Database repositories, external service adapters, caching

**Key architectural decisions**:

- **Domain Events**: Event sourcing system for tracking habit completions, streak milestones, etc.
- **Repository Pattern**: Abstraction over data access with implementations for both SQLite (development) and Supabase (production)
- **Dependency Injection**: Using `tsyringe` for loose coupling and testability
- **Factory Pattern**: AI provider factory allowing switching between rules-based and LLM-based spiritual guidance

Alternatives considered: Microservices were rejected due to complexity overhead for the current scale. The modular monolith provides clear boundaries while maintaining deployment simplicity.

### Internationalization (i18n)

**Library**: next-intl v4.3.9

Full bilingual support for English and Arabic with:
- Automatic locale detection from cookies
- RTL (Right-to-Left) layout support for Arabic
- Custom Arabic fonts (Noto Kufi Arabic, Tajawal, Amiri)
- 500+ translation keys across 20 sections
- Middleware-based locale switching without URL prefixes

Pros: Seamless language switching, excellent Next.js 14 integration
Cons: Requires manual translation management (no automatic translation)

### Authentication & Authorization

**System**: Supabase Auth with Email/Password Authentication

**Security Architecture** (Updated: October 30, 2025):
- **HttpOnly Cookies**: Auth tokens stored in secure, HttpOnly cookies (prevents XSS attacks)
- **Next.js API Routes**: Authentication handled via Next.js API routes at `/api/auth/*`
- **Direct Supabase Integration**: Frontend calls Next.js API routes which communicate directly with Supabase
- **JWT-based Sessions**: Stateless authentication with access tokens (1-hour expiry) and refresh tokens (30-day expiry)
- **Automatic Token Refresh**: Session endpoint automatically refreshes expired access tokens using refresh token
- **Row Level Security (RLS)**: Database-level data isolation in Supabase
- **Middleware Protection**: Next.js middleware enforces authentication on protected routes

**Cookie Names**:
- `sb-access-token`: JWT access token (HttpOnly, secure in production, 1-hour expiry)
- `sb-refresh-token`: Refresh token for session renewal (HttpOnly, secure in production, 30-day expiry)

**Authentication Flow**:
1. User submits credentials via frontend form
2. Frontend calls `/api/auth/login` or `/api/auth/signup` (Next.js API route)
3. API route authenticates with Supabase using service role key
4. On success, sets HttpOnly cookies with tokens (access: 1hr, refresh: 30 days)
5. Middleware validates cookies on subsequent requests
6. When access token expires, `/api/auth/session` automatically refreshes it using the refresh token
7. Protected routes automatically redirect to login if unauthenticated

**API Endpoints**:
- `POST /api/auth/login`: Authenticate user and set cookies
- `POST /api/auth/signup`: Create new user and set cookies
- `POST /api/auth/logout`: Clear authentication cookies
- `GET /api/auth/session`: Check session (auto-refreshes expired access tokens)
- `POST /api/auth/refresh`: Manually refresh access token

**Security Rationale**: 
- HttpOnly cookies prevent JavaScript access to tokens (XSS protection)
- Next.js API routes provide a secure bridge between frontend and Supabase in Replit environment
- No tokens stored in localStorage (vulnerable to XSS attacks)
- SameSite=Lax cookie policy prevents CSRF attacks
- Automatic token refresh maintains user session without re-login for up to 30 days

### State Management

**Client State**: Zustand for complex application state
**Server State**: React Server Components with direct Supabase queries
**Cache**: React Query patterns for API data (planned)

Zustand was chosen over Redux for its simplicity and smaller bundle size, while Server Components reduce client-side state management needs.

### Testing Strategy

**Pyramid Approach**:
- 70% Unit Tests (Vitest for backend, Jest/React Testing Library for frontend)
- 20% Integration Tests (API endpoint testing)
- 10% E2E Tests (Playwright for critical user journeys)

Target coverage: 80% for unit tests, 60% for integration tests.

### Caching Layer

**Multi-tier caching**:
- In-memory cache (default) for development
- Redis cache (optional) for production
- TTL and tag-based invalidation support

The modular cache provider allows easy switching between implementations via environment configuration.

### AI/ML System

**Pluggable Architecture**: Factory pattern for AI providers

Two implementations:
1. **Rules-Based AI** (default): Curated Islamic content matching based on keywords and tags
2. **LLM AI** (optional): OpenAI GPT-based suggestions with Islamic guardrails

The rules-based approach ensures authenticity and avoids hallucinations, while LLM provides enhanced personalization when enabled. Privacy-first: no personal data sent to external AI services.

## External Dependencies

### Database & Backend Services

**Supabase** (PostgreSQL + Auth + Row Level Security)
- Primary production database
- Built-in authentication system
- Real-time subscriptions (planned feature)
- Row Level Security for data privacy

**SQLite** (better-sqlite3)
- Development database
- Testing environment
- Dual-database repository pattern allows seamless switching

### API Integrations

**Adhan** (v4.4.3)
- Islamic prayer time calculations
- Multiple calculation methods (ISNA, MWL, Egypt, etc.)
- Hijri calendar support

**OpenAI API** (optional)
- LLM-based spiritual guidance
- Controlled via AI_PROVIDER environment variable

### Frontend Libraries

**UI Framework**: React 18 with Next.js 14
**Styling**: Tailwind CSS with custom Islamic design system
**Animation**: Framer Motion for smooth transitions
**Icons**: Lucide React + MUI Icons
**Charts**: Chart.js + react-chartjs-2 for analytics visualization
**Forms**: Zod for validation

### Development Tools

**Monorepo**: Turborepo for build orchestration
**Type Safety**: TypeScript 5.3 across all packages
**Testing**: Vitest (backend), Playwright (E2E)
**Linting**: ESLint with Next.js and TypeScript configs
**Formatting**: Prettier

### Deployment Platforms

**Frontend**: Vercel (Next.js native deployment)
**Backend**: Vercel serverless functions (current) or dedicated Node.js server (alternative)
**Database**: Supabase cloud hosting
**Cache**: Redis Cloud (optional, for production scaling)

The Vercel deployment provides zero-config deployments, automatic HTTPS, and global CDN, making it ideal for the Next.js application while keeping infrastructure complexity low.