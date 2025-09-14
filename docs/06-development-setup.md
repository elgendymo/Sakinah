# 💻 Development Setup Guide

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd Sakinah

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development servers
npm run dev
```

This starts both frontend (`:3000`) and backend (`:3001`) in development mode.

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Git**: Latest version
- **Code Editor**: VS Code recommended

### Verification

```bash
# Check versions
node --version    # Should be v18+
npm --version     # Should be v9+
git --version     # Any recent version
```

## Environment Setup

### 1. Supabase Development Instance

**Option A: Use Shared Development Instance**
- Contact team lead for development Supabase credentials
- Add provided credentials to `.env.local`

**Option B: Create Personal Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Run migrations from `supabase/migrations/` in SQL Editor
4. Run seed data from `supabase/seed.sql`

### 2. Environment Variables

Create `.env.local` in project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:3000

# AI Provider (optional)
AI_PROVIDER=rules  # or 'llm'
OPENAI_API_KEY=your-openai-key  # only needed if AI_PROVIDER=llm

# Development flags
NODE_ENV=development
```

### 3. Database Setup

If using personal Supabase instance:

```sql
-- 1. Run in Supabase SQL Editor
-- Copy entire contents of supabase/migrations/001_initial_schema.sql

-- 2. Then run second migration
-- Copy entire contents of supabase/migrations/002_social_gamification.sql

-- 3. Seed Islamic content
-- Copy entire contents of supabase/seed.sql
```

## Development Workflow

### Starting Development

```bash
# Start all services
npm run dev

# Or start services individually
npm run dev:web    # Frontend only (port 3000)
npm run dev:api    # Backend only (port 3001)
```

### Code Quality Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Auto-formatting
npm run format

# Clean build artifacts
npm run clean

# Full build (for testing)
npm run build
```

### Project Structure Navigation

```
Sakinah/
├── apps/
│   ├── web/           # Next.js Frontend
│   │   ├── app/       # App Router pages
│   │   ├── components/# Reusable UI components
│   │   └── lib/       # Client utilities
│   └── api/           # Express Backend
│       ├── src/
│       │   ├── application/  # Use cases
│       │   ├── infrastructure/ # External adapters
│       │   ├── routes/       # HTTP handlers
│       │   └── shared/       # Utilities
│       └── dist/      # Compiled output
├── packages/
│   └── types/         # Shared TypeScript types
├── docs/              # Documentation
├── supabase/          # Database migrations & seeds
└── turbo.json         # Monorepo configuration
```

## VS Code Setup (Recommended)

### Required Extensions

Install these VS Code extensions:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-typescript.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.workingDirectories": ["apps/web", "apps/api"],
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

### Debugging Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/web/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/apps/web",
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    },
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/api/src/index.ts",
      "args": [],
      "cwd": "${workspaceFolder}/apps/api",
      "runtimeArgs": ["--loader", "tsx/esm"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## Development Best Practices

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make commits with conventional format
git commit -m "feat: add habit completion animation"
git commit -m "fix: resolve tazkiyah plan creation issue"
git commit -m "docs: update API documentation"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Message Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Build/dependency updates

### Code Style Guidelines

**TypeScript/JavaScript**:
```typescript
// Use explicit types
interface HabitData {
  id: string;
  title: string;
  streakCount: number;
}

// Use const assertions for literals
const LEVEL_NAMES = {
  1: "Mubtadi (Beginner)",
  2: "Salik (Traveler)",
} as const;

// Prefer async/await over Promises
async function createHabit(data: CreateHabitInput): Promise<Habit> {
  const result = await habitRepo.create(data);
  return result;
}
```

**React Components**:
```tsx
// Use function components with TypeScript
interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
}

function HabitCard({ habit, onToggle }: HabitCardProps) {
  return (
    <div className="p-4 border rounded">
      <h3>{habit.title}</h3>
      <button onClick={() => onToggle(habit.id)}>
        Toggle Complete
      </button>
    </div>
  );
}
```

**CSS/Tailwind**:
```tsx
// Use Tailwind utilities consistently
<div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
  <Icon className="w-6 h-6 text-green-500" />
  <span className="text-gray-700">Content here</span>
</div>
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (API only currently)
cd apps/api && npm run test:watch

# Run specific test file
cd apps/api && npm test -- --grep "Habit"
```

### Writing Tests

**API Tests** (`apps/api/src/__tests__/`):
```typescript
import { describe, it, expect } from 'vitest';
import { calculateKhayrPoints } from '../application/calculateKhayrPoints';

describe('Khayr Points Calculation', () => {
  it('should award base points for habit completion', () => {
    const points = calculateKhayrPoints({
      currentStreak: 0,
      isFirstTime: false
    });

    expect(points).toBe(10);
  });

  it('should award bonus for streak', () => {
    const points = calculateKhayrPoints({
      currentStreak: 14,
      isFirstTime: false
    });

    expect(points).toBe(20); // 10 base + 10 streak bonus
  });
});
```

## Debugging

### Common Development Issues

**Port Already in Use**:
```bash
# Kill process using port 3000 or 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Module Resolution Issues**:
```bash
# Clear node modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

**TypeScript Compilation Issues**:
```bash
# Clear TypeScript cache
npm run clean
rm -rf apps/web/.next
npm run type-check
```

**Supabase Connection Issues**:
1. Verify environment variables are correct
2. Check if Supabase project is active
3. Ensure RLS policies allow your operations
4. Check browser network tab for actual error details

### Logging and Debugging

**Backend Logging**:
```typescript
import { logger } from '../shared/logger';

// Use structured logging
logger.info('Habit created successfully', {
  userId,
  habitId,
  streakCount
});

logger.error('Failed to create habit', {
  userId,
  error: error.message
});
```

**Frontend Debugging**:
```typescript
// Use Next.js built-in debugging
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', { user, habits });
}

// Use React DevTools for component debugging
```

## Performance Development

### Bundle Analysis

```bash
# Analyze frontend bundle
cd apps/web
npm run build
npx @next/bundle-analyzer

# Check API build size
cd apps/api
npm run build
du -sh dist/
```

### Database Query Performance

```sql
-- Enable query timing in Supabase
EXPLAIN ANALYZE SELECT * FROM habits
WHERE user_id = 'uuid' AND status = 'active';
```

### API Response Times

```typescript
// Add timing middleware in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.path}: ${Date.now() - start}ms`);
    });
    next();
  });
}
```

## Islamic Content Guidelines

### When Adding New Content

1. **Source Verification**: Ensure all Quranic verses and Hadith have proper citations
2. **Translation Quality**: Use established translations (Sahih International for Quran)
3. **Context Preservation**: Include enough context to prevent misinterpretation
4. **Scholarly Review**: Complex religious guidance should be reviewed by qualified scholars

### Content Formatting

```sql
-- Quranic verse example
INSERT INTO content_snippets (type, text, ref, tags) VALUES (
  'ayah',
  'And whoever fears Allah - He will make for him a way out.',
  'Quran 65:2',
  ARRAY['tawakkul', 'trust', 'provision', 'relief']
);

-- Hadith example
INSERT INTO content_snippets (type, text, ref, tags) VALUES (
  'hadith',
  'The strong is not the one who overcomes people by his strength, but the strong is the one who controls himself while in anger.',
  'Sahih al-Bukhari 6114',
  ARRAY['anger', 'self-control', 'strength']
);
```

## Contribution Guidelines

### Before Contributing

1. Read the Islamic principles in project documentation
2. Understand the privacy-first approach
3. Familiarize yourself with the Tazkiyah methodology
4. Review existing code patterns

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation if needed
4. Ensure all checks pass
5. Request review from team lead
6. Address feedback promptly

### Code Review Checklist

- [ ] Islamic authenticity maintained
- [ ] Privacy principles upheld
- [ ] TypeScript types properly defined
- [ ] Error handling implemented
- [ ] Tests written for new features
- [ ] Documentation updated
- [ ] No sensitive data exposed

---

This development setup ensures contributors can quickly become productive while maintaining the Islamic values and technical standards that define Sakinah.