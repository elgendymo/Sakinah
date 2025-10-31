# Sakinah - Muslim Spiritual Growth Platform

Sakinah is a privacy-first, Shariah-compliant digital companion for Muslims seeking purposeful spiritual growth. It weaves classical disciplines of tazkiyah with modern habit design to help you purify the heart, nurture consistent worship, and stay anchored in righteous companionship—without compromising sincerity or data ownership.

Whether you're rebuilding your routine after hardship, guiding a halaqah, or simply striving for more intentional worship, Sakinah gathers the reminders, plans, and reflections you need into one spiritually safe space.

### Highlights

- **Holistic transformation** – Pair takhlīyah (removing diseases) with taḥlīyah (adorning virtues) through guided programs and micro-habits.
- **Guided daily rhythm** – Begin each morning with sincere intentions and end every evening with muḥāsabah-driven reflection.
- **Supportive companionship** – Form intimate circles for du'a, encouragement, and accountability without the noise of public timelines.
- **Built on trust** – Privacy-first architecture, RLS-secured data, and no vanity metrics to protect ikhlāṣ.

## Features

### Core Modules
- **Tazkiyah Engine**: Diagnose spiritual diseases and cultivate virtues with scholar-informed plans and AI-assisted suggestions.
- **Daily Rituals**: Structure mornings and evenings around dhikr, intentions, and reflective prompts grounded in Quran and Sunnah.
- **Habit Tracker**: Build consistent acts of worship with streaks, reminders, and context-aware nudges.
- **Spiritual Journal**: Capture private reflections, victories, and lessons with thematic tags and Islamic prompts.
- **Social Circles**: Stay connected to a small, righteous cohort through anonymous encouragement and shared goals.
- **AI Suggestions**: Access rule-based or LLM-powered guidance reviewed for spiritual safety.
- **Khayr Gamification**: Celebrate steady progress through spiritually grounded achievements and Khayr XP.
- **Privacy-First**: Own your data with RLS-secured Supabase storage, optional local-first modes, and zero public profiles.

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

This project is intended for the benefit of the Muslim ummah. Please use it responsibly and in accordance with Islamic principles.
