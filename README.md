# Sakinah - Muslim Spiritual Growth Platform

A privacy-first, Shariah-compliant web application for spiritual purification (tazkiyah), habit building, and righteous companionship.

## Features

### Core Modules
- **Tazkiyah Engine**: Takhliyah (purification from diseases) & Taḥliyah (adorning with virtues)
- **Daily Rituals**: Morning intentions and evening muhasabah (self-accountability)
- **Habit Tracker**: Build consistent spiritual habits with streak tracking
- **AI Suggestions**: Rule-based or LLM-powered spiritual guidance
- **Privacy-First**: All data private by default, no social validation metrics

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js + Express (TypeScript)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth (Magic Links)
- **Architecture**: Modular Monolith with Clean Architecture

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sakinah.git
   cd sakinah
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Supabase**
   - Create a new Supabase project
   - Run the migration: Copy contents of `supabase/migrations/001_initial_schema.sql` to SQL Editor
   - Seed initial content: Copy contents of `supabase/seed.sql` to SQL Editor
   - Get your API keys from Settings > API

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials and other configuration

5. **Start development servers**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Project Structure

```
/sakinah
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   └── types/        # Shared TypeScript types
└── supabase/
    ├── migrations/   # Database schema
    └── seed.sql      # Initial content
```

## API Endpoints

- `POST /api/tazkiyah/suggest` - Get personalized spiritual plan
- `GET /api/plans/active` - Get user's active plans
- `POST /api/habits/:id/toggle` - Mark habit complete/incomplete
- `POST /api/checkins` - Create daily check-in
- `GET /api/content` - Get Islamic content snippets

## Deployment

### Vercel Deployment

1. **Frontend**: Deploy the Next.js app from `apps/web`
2. **Backend**: Deploy Express as Vercel Functions from `apps/api`
3. **Environment Variables**: Add all variables from `.env.example` to Vercel

## Contributing

This project aims to help Muslims in their spiritual journey. Contributions that align with Islamic values and improve the platform are welcome.

## Privacy & Ethics

- All user data is private by default
- No tracking or analytics beyond essential functionality
- No social metrics or public profiles
- Designed to reduce digital addiction, not increase it

## License

This project is intended for the benefit of the Muslim ummah. Please use responsibly and in accordance with Islamic principles.