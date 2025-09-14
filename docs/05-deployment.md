# 🚀 Deployment Guide

## Overview

Sakinah is designed for deployment on modern cloud platforms with separate deployment of frontend and backend components.

## Recommended Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Vercel)      │◄──►│   (Vercel)      │◄──►│   (Supabase)    │
│   Next.js App   │    │   Express API   │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

- Node.js 18+ and npm 9+
- Supabase project
- Vercel account (recommended)
- OpenAI API key (optional, for LLM AI features)

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create new project
2. Note your project URL and anon key
3. Generate service role key from Settings → API

### 2. Run Database Migration

```sql
-- Copy and paste contents of supabase/migrations/001_initial_schema.sql
-- into Supabase SQL Editor and run

-- Then run supabase/migrations/002_social_gamification.sql
-- This sets up all tables, RLS policies, and triggers
```

### 3. Seed Islamic Content

```sql
-- Copy and paste contents of supabase/seed.sql
-- This populates the content_snippets table with Quranic verses,
-- Hadith, and duas essential for the Tazkiyah system
```

### 4. Configure Authentication

In Supabase Dashboard → Authentication → Settings:

- **Site URL**: Set to your production frontend URL
- **Redirect URLs**: Add your frontend domain
- **Email Templates**: Customize magic link emails (optional)
- **Rate Limiting**: Configure as needed

## Environment Variables

### Frontend Environment (.env.local)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-domain.vercel.app/api

# Development only
NEXT_PUBLIC_DEV_MODE=false
```

### Backend Environment

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# API Configuration
FRONTEND_URL=https://your-frontend-domain.vercel.app
PORT=3001

# AI Provider Configuration
AI_PROVIDER=rules  # or 'llm'
OPENAI_API_KEY=your-openai-key  # required if AI_PROVIDER=llm

# Environment
NODE_ENV=production
```

## Vercel Deployment

### 1. Deploy Backend API

```bash
# From project root
cd apps/api

# Install Vercel CLI if not installed
npm i -g vercel

# Deploy API
vercel --prod

# Configure environment variables in Vercel dashboard
```

**Vercel Configuration for API** (`apps/api/vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/index.js"
    }
  ]
}
```

### 2. Deploy Frontend

```bash
# From project root
cd apps/web

# Deploy frontend
vercel --prod

# Configure environment variables in Vercel dashboard
```

**Important**: Update `NEXT_PUBLIC_API_URL` in frontend environment to point to your deployed API.

## Alternative Deployment Options

### Docker Deployment

**Backend Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
RUN npm ci --only=production

# Copy source
COPY apps/api ./apps/api
COPY packages/types ./packages/types

# Build
WORKDIR /app/packages/types
RUN npm run build

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/types/package*.json ./packages/types/
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Railway Deployment

1. Connect GitHub repository to Railway
2. Deploy API and frontend as separate services
3. Configure environment variables
4. Set up custom domains

### DigitalOcean App Platform

1. Create new app from GitHub
2. Configure build and run commands
3. Set environment variables
4. Configure custom domains

## Environment-Specific Configuration

### Production Optimizations

**Frontend (next.config.js)**:
```javascript
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/:path*',
      },
    ];
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  swcMinify: true,
};
```

**Backend Optimizations**:
```typescript
// Compression middleware
app.use(compression());

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
app.use('/api/', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
}));
```

## SSL and Security

### HTTPS Setup

Both Vercel and modern cloud platforms provide automatic HTTPS with Let's Encrypt certificates.

### Security Headers

Ensure these headers are set:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Content Security Policy

```typescript
// Next.js security headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
  }
];
```

## Monitoring and Logging

### Error Tracking

**Sentry Integration** (optional):
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Performance Monitoring

**Vercel Analytics**:
```typescript
// Add to _app.tsx
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Health Checks

Both services include health check endpoints:
- Frontend: `/api/health` (proxied to backend)
- Backend: `/api/health`

## Backup and Recovery

### Database Backups

Supabase provides automatic daily backups. For additional safety:

```sql
-- Manual backup command (if using self-hosted PostgreSQL)
pg_dump -U username -h hostname -p port database_name > backup.sql

-- Restore command
psql -U username -h hostname -p port database_name < backup.sql
```

### File Backups

Since Sakinah is largely database-driven with minimal file uploads, ensure:
1. Regular database backups
2. Environment variables are documented
3. Source code is in version control

## Scaling Considerations

### Database Scaling

- **Supabase**: Automatically scales with plan upgrades
- **Connection pooling**: Built into Supabase
- **Read replicas**: Available on higher Supabase plans

### Application Scaling

- **Vercel**: Automatic scaling with serverless functions
- **CDN**: Vercel provides global CDN automatically
- **Caching**: Implement Redis for session storage if needed

### Cost Optimization

1. **Supabase**: Start with free tier, upgrade as needed
2. **Vercel**: Optimize bundle size to reduce function execution time
3. **API calls**: Implement caching for content endpoints
4. **Database queries**: Use efficient queries and indexing

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Content seeded
- [ ] Build passes locally
- [ ] All tests pass
- [ ] Security headers configured

### Post-Deployment

- [ ] Health checks respond
- [ ] Authentication works
- [ ] Database connections established
- [ ] SSL certificates active
- [ ] Error tracking configured
- [ ] Performance monitoring active

### Go-Live Checklist

- [ ] Domain configured
- [ ] DNS propagated
- [ ] Email delivery working (magic links)
- [ ] All features tested in production
- [ ] Backup procedures tested
- [ ] Monitoring alerts configured

## Troubleshooting

### Common Issues

**Build Failures**:
```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

**Environment Variable Issues**:
- Ensure all required variables are set
- Check variable names match exactly
- Verify Supabase keys are correct

**Database Connection Issues**:
- Verify Supabase URL and keys
- Check RLS policies are correctly configured
- Ensure JWT secret matches

**CORS Issues**:
```typescript
// Backend CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

### Performance Issues

**Slow API Response**:
- Check database query performance
- Implement caching for frequently accessed content
- Optimize bundle size

**Memory Issues**:
- Monitor serverless function memory usage
- Optimize large data processing
- Implement pagination for large datasets

---

This deployment guide ensures Sakinah can be reliably deployed and scaled while maintaining the Islamic principles and privacy-first approach that define the application.