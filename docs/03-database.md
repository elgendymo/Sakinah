# 🗄️ Database Schema Documentation

## Overview

Sakinah uses **Supabase (PostgreSQL)** with **Row Level Security (RLS)** to ensure complete privacy and data isolation between users. The schema is designed around Islamic spiritual concepts while maintaining modern database best practices.

## Entity Relationship Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Users    │    │  Profiles   │    │    Plans    │
│             │    │             │    │             │
│ id (UUID)   │◄──►│ user_id(FK) │    │ user_id(FK) │◄─┐
│ handle      │    │ display_name│    │ kind        │  │
│ created_at  │    │ timezone    │    │ target      │  │
└─────────────┘    └─────────────┘    │ micro_habits│  │
                                     └─────────────┘  │
                                           │          │
                                           ▼          │
┌─────────────┐    ┌──────────────────┐   │   ┌─────────────┐
│   Habits    │    │ Habit_Completions│   │   │  Checkins   │
│             │    │                  │   │   │             │
│ id (UUID)   │◄──►│ habit_id (FK)    │   │   │ user_id(FK) │
│ user_id(FK) │    │ user_id (FK)     │   │   │ date        │
│ plan_id(FK) │────┘ completed_on     │   │   │ mood        │
│ title       │      UNIQUE(habit_id, │   │   │ intention   │
│ schedule    │            completed_on)  │   │ reflection  │
│ streak_count│                           │   └─────────────┘
└─────────────┘                           │
                                         │
┌─────────────┐    ┌─────────────────┐   │   ┌─────────────┐
│  Journals   │    │ Content_Snippets│   │   │ User_Stats  │
│             │    │                 │   │   │             │
│ id (UUID)   │    │ id (UUID)       │   │   │ user_id(FK) │
│ user_id(FK) │    │ type            │   │   │ total_khayr │
│ content     │    │ text            │   │   │ current_streak
│ tags []     │    │ ref             │   │   │ level       │
│ created_at  │    │ tags []         │   │   │ achievements│
└─────────────┘    │ created_at      │   │   └─────────────┘
                   └─────────────────┘   │
                                        │
┌─────────────────────────────────────┐ │
│           Social Circles            │ │
│                                     │ │
│  ┌─────────────┐  ┌──────────────┐  │ │
│  │   Circles   │  │ Memberships  │  │ │
│  │             │  │              │  │ │
│  │ id (UUID)   │◄─┤ circle_id(FK)│  │ │
│  │ name        │  │ user_id (FK) │──┼─┘
│  │ creator_id  │  │ role         │  │
│  │ max_members │  │ joined_at    │  │
│  │ is_anonymous│  └──────────────┘  │
│  │ shared_goal │                    │
│  └─────────────┘                    │
│           │                         │
│           ▼                         │
│  ┌─────────────────────────────┐    │
│  │   Circle_Encouragements     │    │
│  │                            │    │
│  │ id (UUID)                  │    │
│  │ circle_id (FK)             │    │
│  │ from_user_id (FK)          │    │
│  │ to_user_id (FK, optional)  │    │
│  │ message                    │    │
│  │ type (dua/encouragement)   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Core Tables

### 1. Users & Authentication

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Extends Supabase auth.users with app-specific data
**Key Points**:
- `id` references Supabase auth system
- `handle` is optional unique identifier
- Minimal data storage following privacy-first design

#### profiles
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: User profile information and preferences
**Key Points**:
- One-to-one relationship with users
- `display_name` for identification (can be anonymous)
- `timezone` for localized experiences

### 2. Tazkiyah System

#### plans
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  kind TEXT CHECK (kind IN ('takhliyah', 'tahliyah')) NOT NULL,
  target TEXT NOT NULL,
  micro_habits JSONB NOT NULL,
  dua_ids UUID[],
  content_ids UUID[],
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Core spiritual development plans
**Key Points**:
- `kind`: 'takhliyah' (purification) or 'tahliyah' (beautification)
- `target`: What the user is working on (e.g., "anger", "patience")
- `micro_habits`: JSONB array of small daily actions
- `content_ids`: References to relevant Islamic content
- Soft delete with `status` field

**Example micro_habits JSON**:
```json
[
  {
    "title": "Make istighfar 10 times after each prayer",
    "schedule": "daily",
    "target": 5
  },
  {
    "title": "Read Surah Al-Fatiha with contemplation",
    "schedule": "daily",
    "target": 1
  }
]
```

#### habits
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  schedule JSONB NOT NULL,
  streak_count INTEGER DEFAULT 0 NOT NULL,
  last_completed_on DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Individual trackable habits derived from plans
**Key Points**:
- Each micro-habit becomes a trackable habit
- `schedule`: JSONB for flexible scheduling options
- `streak_count`: Cached for performance
- `last_completed_on`: For streak calculation

#### habit_completions
```sql
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  completed_on DATE NOT NULL,
  UNIQUE(habit_id, completed_on)
);
```

**Purpose**: Track daily habit completions
**Key Points**:
- One record per habit per day
- UNIQUE constraint prevents duplicates
- Used for streak calculation and gamification

### 3. Self-Reflection System

#### checkins
```sql
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  mood SMALLINT CHECK (mood >= -2 AND mood <= 2),
  intention TEXT,
  reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);
```

**Purpose**: Daily muhasabah (self-accountability) entries
**Key Points**:
- One check-in per user per day
- `mood`: Scale from -2 (struggling) to +2 (blessed)
- `intention`: Morning spiritual focus
- `reflection`: Evening self-reflection

#### journals
```sql
CREATE TABLE journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Private spiritual journaling
**Key Points**:
- Free-form spiritual reflection
- `tags`: Array for categorization (e.g., ['dua', 'gratitude', 'struggle'])
- No length limits for deep reflection

### 4. Social Features

#### circles
```sql
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  description TEXT CHECK (length(description) <= 500),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  max_members INTEGER NOT NULL CHECK (max_members >= 3 AND max_members <= 7),
  is_anonymous BOOLEAN DEFAULT FALSE,
  shared_goal TEXT CHECK (length(shared_goal) <= 200),
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Small righteous companionship groups
**Key Points**:
- Limited to 3-7 members for intimacy
- `is_anonymous`: Hides member identities
- `shared_goal`: Optional common spiritual objective

#### circle_memberships
```sql
CREATE TABLE circle_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('creator', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(circle_id, user_id)
);
```

**Purpose**: Tracks who belongs to which circles
**Key Points**:
- Many-to-many relationship between users and circles
- `role`: 'creator' has additional permissions
- UNIQUE constraint prevents duplicate memberships

#### circle_encouragements
```sql
CREATE TABLE circle_encouragements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (length(message) >= 1 AND length(message) <= 300),
  type TEXT CHECK (type IN ('dua', 'encouragement', 'reminder')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Messages of support within circles
**Key Points**:
- `to_user_id`: Optional for targeted messages
- `type`: Different kinds of spiritual support
- Length limited to encourage concise, meaningful messages

### 5. Gamification System

#### user_stats
```sql
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_khayr_points INTEGER DEFAULT 0 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  habits_completed INTEGER DEFAULT 0 NOT NULL,
  plans_completed INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  achievements TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Gamification stats for each user
**Key Points**:
- `khayr_points`: Islamic concept of rewards for good deeds
- Streak tracking for consistency motivation
- `achievements`: Array of earned achievement IDs
- Automatically initialized via trigger

#### achievements
```sql
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT CHECK (condition_type IN ('streak', 'habits_completed', 'plans_completed', 'consistency')) NOT NULL,
  condition_target INTEGER NOT NULL,
  khayr_reward INTEGER NOT NULL
);
```

**Purpose**: Defines available achievements
**Key Points**:
- Static reference data
- `condition_type`: What triggers the achievement
- `khayr_reward`: Points earned when unlocked

### 6. Content Management

#### content_snippets
```sql
CREATE TABLE content_snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT CHECK (type IN ('ayah', 'hadith', 'dua', 'note')) NOT NULL,
  text TEXT NOT NULL,
  ref TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Purpose**: Curated Islamic content for inspiration and guidance
**Key Points**:
- `type`: Quran verses, Prophetic traditions, supplications, or notes
- `ref`: Source reference (e.g., "Surah Al-Baqarah 2:286")
- `tags`: For matching with user struggles/goals
- Admin-curated content only

## Indexes for Performance

```sql
-- Plans and Habits
CREATE INDEX idx_plans_user_status ON plans(user_id, status);
CREATE INDEX idx_habits_user ON habits(user_id);
CREATE INDEX idx_habit_completions_habit ON habit_completions(habit_id);

-- Self-Reflection
CREATE INDEX idx_checkins_user_date ON checkins(user_id, date);
CREATE INDEX idx_journals_user ON journals(user_id);

-- Social Features
CREATE INDEX idx_circles_creator ON circles(creator_id);
CREATE INDEX idx_circle_memberships_circle ON circle_memberships(circle_id);
CREATE INDEX idx_circle_memberships_user ON circle_memberships(user_id);
CREATE INDEX idx_circle_encouragements_circle ON circle_encouragements(circle_id);

-- Content and Stats
CREATE INDEX idx_content_snippets_tags ON content_snippets USING GIN(tags);
CREATE INDEX idx_user_stats_level ON user_stats(level DESC);
```

## Row Level Security (RLS) Policies

### User Data Protection
```sql
-- Users can only see and update their own data
CREATE POLICY "Users can view own user data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can manage own plans" ON plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

-- Similar policies for all user-owned tables...
```

### Social Features Security
```sql
-- Users can view circles they are members of
CREATE POLICY "Users can view circles they are members of" ON circles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_memberships
      WHERE circle_memberships.circle_id = circles.id
      AND circle_memberships.user_id = auth.uid()
    )
  );

-- Circle members can view encouragements
CREATE POLICY "Circle members can view encouragements" ON circle_encouragements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_memberships
      WHERE circle_memberships.circle_id = circle_encouragements.circle_id
      AND circle_memberships.user_id = auth.uid()
    )
  );
```

### Public Content
```sql
-- Content snippets are public read
CREATE POLICY "Content snippets are public" ON content_snippets
  FOR SELECT USING (true);

-- Achievements are public read
CREATE POLICY "Achievements are public" ON achievements
  FOR SELECT USING (true);
```

## Database Functions and Triggers

### Auto-Initialize User Stats
```sql
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_user_stats
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_stats();
```

### Update Stats on Habit Completion
```sql
CREATE OR REPLACE FUNCTION update_user_stats_on_habit_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_stats
  SET
    habits_completed = habits_completed + 1,
    total_khayr_points = total_khayr_points + 10,
    last_updated = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats_habit
  AFTER INSERT ON habit_completions
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_habit_completion();
```

## Data Migration Strategy

### Version Control
- All schema changes in `supabase/migrations/`
- Sequential numbering: `001_initial_schema.sql`, `002_add_social_features.sql`
- Each migration is idempotent and can be run multiple times safely

### Seed Data
- Initial content in `supabase/seed.sql`
- Islamic content curated by scholars
- Default achievements and system data

### Backup Strategy
- Supabase provides automatic backups
- Additional exports for critical Islamic content
- Regular testing of restore procedures

## Performance Considerations

### Query Optimization
- Indexes on frequently queried columns
- GIN indexes for array/JSONB columns
- Efficient JOIN patterns using foreign keys

### Scaling Considerations
- Partitioning for large tables (future)
- Read replicas for content_snippets
- Connection pooling handled by Supabase

### Privacy by Design
- Minimal data collection
- Automatic data expiry options (future)
- User-controlled data retention settings

---

This database schema provides a solid foundation for Islamic spiritual growth while maintaining the highest standards of privacy and performance.