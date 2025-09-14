# 🏗️ Architecture Guide

## Overview

Sakinah follows a **Modular Monolith** architecture with **Clean Architecture** principles, designed for rapid development while maintaining clear separation of concerns.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Express API   │    │   Supabase DB   │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│   MVVM Pattern  │    │ Clean Arch      │    │   + Auth        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌──────────┐            ┌──────────┐
    │ Browser │            │   AI     │            │   Row    │
    │   UI    │            │ Factory  │            │  Level   │
    └─────────┘            └──────────┘            │Security  │
                                                   └──────────┘
```

## Monorepo Structure

```
/Sakinah/
├── apps/
│   ├── web/           # Next.js 14 Frontend
│   └── api/           # Express.js Backend
├── packages/
│   └── types/         # Shared TypeScript Types
├── supabase/
│   ├── migrations/    # Database Migrations
│   └── seed.sql      # Initial Data
└── docs/             # Documentation
```

## Frontend Architecture (Next.js)

### MVVM Pattern Implementation

```typescript
// Feature Structure
app/feature/
├── page.tsx           # View (React Component)
├── view-model.ts      # View Model (State & Logic)
├── types.ts          # Feature-specific Types
└── components/       # Reusable UI Components
```

### Key Frontend Patterns

#### 1. **Server Components for Data Fetching**
```typescript
// apps/web/app/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <DashboardClient userId={user.id} />;
}
```

#### 2. **Client Components for Interactivity**
```typescript
// apps/web/app/dashboard/dashboard-client.tsx
'use client';

export default function DashboardClient({ userId }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  // Component logic here
}
```

#### 3. **API Client Abstraction**
```typescript
// apps/web/lib/api.ts
export const api = {
  createPlan: (mode: PlanKind, input: string, token: string) =>
    apiCall('/tazkiyah/create', { method: 'POST', body: { mode, input }, token }),
};
```

## Backend Architecture (Express.js)

### Clean Architecture Layers

```
src/
├── application/       # Use Cases (Business Logic)
│   ├── suggestPlan.ts
│   ├── toggleHabit.ts
│   └── logCheckin.ts
├── domain/           # Entities & Interfaces (Future)
├── infrastructure/   # External Adapters
│   ├── ai/          # AI Providers (Rules/LLM)
│   ├── auth/        # Supabase JWT Middleware
│   ├── db/          # Database Client
│   └── repos/       # Repository Implementations
├── routes/          # HTTP Route Handlers
└── shared/          # Utilities (Errors, Result Types)
```

### Key Backend Patterns

#### 1. **Repository Pattern**
```typescript
// apps/api/src/infrastructure/repos/HabitRepository.ts
export class HabitRepository {
  async createHabit(data: CreateHabitData): Promise<Habit> {
    const { data: habit, error } = await supabase
      .from('habits')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(habit);
  }
}
```

#### 2. **Use Case Pattern**
```typescript
// apps/api/src/application/toggleHabit.ts
export async function toggleHabit(input: ToggleHabitInput): Promise<Result<ToggleHabitOutput>> {
  try {
    const habitRepo = new HabitRepository();
    const statsRepo = new UserStatsRepository();

    // Business logic here
    return Result.ok({ streakCount, khayrPointsEarned, newAchievements });
  } catch (error) {
    return Result.error(error);
  }
}
```

#### 3. **Factory Pattern for AI**
```typescript
// apps/api/src/infrastructure/ai/factory.ts
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'rules';

  switch (provider) {
    case 'llm': return new LlmAiProvider();
    case 'rules':
    default: return new RulesAiProvider();
  }
}
```

#### 4. **Result Pattern for Error Handling**
```typescript
// apps/api/src/shared/result.ts
export class Result<T, E = Error> {
  static ok<T>(value: T): Result<T> {
    return new Result(true, value, undefined);
  }

  static error<E>(error: E): Result<never, E> {
    return new Result(false, undefined, error);
  }
}
```

## Database Architecture (Supabase)

### Core Tables Structure

```sql
-- User Management
users (id, handle, created_at)
profiles (user_id, display_name, timezone, created_at)

-- Tazkiyah System
plans (id, user_id, kind, target, micro_habits, content_ids, status)
habits (id, user_id, plan_id, title, schedule, streak_count)
habit_completions (id, habit_id, user_id, completed_on)

-- Self-Reflection
checkins (id, user_id, date, mood, intention, reflection)
journals (id, user_id, content, tags, created_at)

-- Social Features
circles (id, name, creator_id, max_members, is_anonymous)
circle_memberships (id, circle_id, user_id, role)
circle_encouragements (id, circle_id, from_user_id, message, type)

-- Gamification
user_stats (user_id, total_khayr_points, current_streak, level)
achievements (id, title, description, condition_type, khayr_reward)

-- Content Management
content_snippets (id, type, text, ref, tags)
```

### Row Level Security (RLS)

All user data is protected with RLS policies:

```sql
-- Example: Users can only see their own plans
CREATE POLICY "Users can manage own plans" ON plans
  FOR ALL USING (auth.uid() = user_id);
```

## Authentication & Security

### Supabase Auth Integration

```typescript
// Server-side authentication
// apps/web/lib/supabase-server.ts
export async function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: () => cookieStore }
  );
}

// Client-side authentication
// apps/web/lib/supabase-browser.ts
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

### JWT Middleware (API)

```typescript
// apps/api/src/infrastructure/auth/middleware.ts
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = user.id;
  next();
}
```

## AI Architecture

### Pluggable Provider System

```typescript
interface AIProvider {
  suggest(input: { mode: PlanKind; text: string }): Promise<PlanSuggestion>;
  explain(input: { struggle: string }): Promise<AIExplanation>;
}

// Rule-based provider (default)
class RulesAiProvider implements AIProvider {
  async suggest(input: SuggestionInput): Promise<PlanSuggestion> {
    // Tag-based matching to curated Islamic content
    const tags = this.extractTags(input.text);
    const habits = this.generateHabits(input.mode, tags);
    return { microHabits: habits, tags };
  }
}

// LLM provider (optional)
class LlmAiProvider implements AIProvider {
  async suggest(input: SuggestionInput): Promise<PlanSuggestion> {
    // OpenAI integration with Islamic context
    const prompt = this.buildIslamicPrompt(input);
    const response = await openai.completions.create({ prompt });
    return this.parseResponse(response);
  }
}
```

## Deployment Architecture

### Vercel Deployment

```yaml
# Frontend (apps/web)
- Platform: Vercel
- Framework: Next.js 14
- Build Command: npm run build
- Deploy: Automatic on push to main

# Backend (apps/api)
- Platform: Vercel Functions
- Runtime: Node.js
- Entry: src/index.ts
- Routes: /api/*
```

### Environment Configuration

```bash
# Shared (both apps)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API Only
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
AI_PROVIDER=rules # or 'llm'
OPENAI_API_KEY=your_openai_key # if using LLM
```

## Development Workflow

### Monorepo Management with Turbo

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "inputs": ["src/**", "public/**", "package.json"]
    },
    "dev": {
      "inputs": ["src/**", "public/**", "package.json"]
    },
    "type-check": {
      "inputs": ["src/**", "package.json", "tsconfig.json"]
    }
  }
}
```

### Scripts

```bash
# Root level
npm run dev        # Start all apps in development
npm run build      # Build all packages
npm run type-check # TypeScript validation
npm run lint       # ESLint all packages

# Individual packages
cd apps/web && npm run dev     # Next.js dev server
cd apps/api && npm run dev     # Express dev server with tsx
```

## Performance Considerations

### Frontend Optimizations
- **Server Components**: Reduce client-side JavaScript
- **Route Groups**: Organize related pages efficiently
- **Dynamic Imports**: Code splitting for large components
- **Image Optimization**: Next.js built-in image optimization

### Backend Optimizations
- **Connection Pooling**: Supabase handles automatically
- **Query Optimization**: Indexed columns and efficient joins
- **Caching**: Redis for session storage (future enhancement)
- **Rate Limiting**: Express middleware for API protection

### Database Optimizations
- **Indexes**: On frequently queried columns
- **RLS Policies**: Efficient row-level security
- **Partitioning**: For large tables (future consideration)
- **Read Replicas**: For scaling read operations

---

This architecture provides a solid foundation for the Sakinah application while maintaining flexibility for future growth and Islamic compliance.