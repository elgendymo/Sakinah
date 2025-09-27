-- SQLite schema for Sakinah app (development)
-- This mirrors the Supabase schema but adapted for SQLite

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar', 'ur')),
  location TEXT, -- JSON object with lat, lng, city, country
  prayer_calculation_method TEXT DEFAULT 'ISNA' CHECK (prayer_calculation_method IN ('ISNA', 'MWL', 'Egypt', 'Makkah', 'Karachi', 'Tehran', 'Jafari')),
  notification_settings TEXT DEFAULT '{}', -- JSON object for notification preferences
  privacy_settings TEXT DEFAULT '{}', -- JSON object for privacy preferences
  display_settings TEXT DEFAULT '{}', -- JSON object for display preferences
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Content snippets (admin-seeded)
CREATE TABLE IF NOT EXISTS content_snippets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  type TEXT CHECK (type IN ('ayah', 'hadith', 'dua', 'note')) NOT NULL,
  text TEXT NOT NULL,
  ref TEXT NOT NULL,
  tags TEXT DEFAULT '[]', -- JSON array as TEXT in SQLite
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  kind TEXT CHECK (kind IN ('takhliyah', 'tahliyah')) NOT NULL,
  target TEXT NOT NULL,
  micro_habits TEXT NOT NULL, -- JSON as TEXT in SQLite
  dua_ids TEXT, -- JSON array as TEXT
  content_ids TEXT, -- JSON array as TEXT
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  schedule TEXT NOT NULL, -- JSON as TEXT in SQLite
  streak_count INTEGER DEFAULT 0 NOT NULL,
  last_completed_on TEXT, -- ISO date string
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Habit completions table
CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  habit_id TEXT REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  completed_on TEXT NOT NULL, -- ISO date string
  UNIQUE(habit_id, completed_on)
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL, -- ISO date string
  mood INTEGER CHECK (mood >= -2 AND mood <= 2),
  intention TEXT,
  reflection TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

-- Journals table
CREATE TABLE IF NOT EXISTS journals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  tags TEXT, -- JSON array as TEXT
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Intentions table
CREATE TABLE IF NOT EXISTS intentions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium' NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active' NOT NULL,
  target_date TEXT, -- ISO date string (YYYY-MM-DD)
  completed_at TEXT, -- ISO datetime string
  reminder_enabled INTEGER DEFAULT 0 NOT NULL, -- BOOLEAN as INTEGER in SQLite
  reminder_time TEXT, -- HH:MM format
  reminder_days_of_week TEXT, -- JSON array as TEXT
  tags TEXT DEFAULT '[]', -- JSON array as TEXT
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Prayer times table
CREATE TABLE IF NOT EXISTS prayer_times (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  city TEXT,
  country TEXT,
  timezone TEXT,
  calculation_method TEXT NOT NULL DEFAULT 'MuslimWorldLeague',
  date TEXT NOT NULL, -- ISO date string (YYYY-MM-DD)
  fajr TEXT NOT NULL, -- ISO datetime string
  sunrise TEXT NOT NULL, -- ISO datetime string
  dhuhr TEXT NOT NULL, -- ISO datetime string
  asr TEXT NOT NULL, -- ISO datetime string
  maghrib TEXT NOT NULL, -- ISO datetime string
  isha TEXT NOT NULL, -- ISO datetime string
  qiyam TEXT, -- ISO datetime string for last third of night
  hijri_date TEXT,
  valid_until TEXT NOT NULL, -- ISO datetime string
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_user_status ON plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_user_created ON journals(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_content_snippets_type ON content_snippets(type);
CREATE INDEX IF NOT EXISTS idx_intentions_user ON intentions(user_id);
CREATE INDEX IF NOT EXISTS idx_intentions_user_status ON intentions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_intentions_user_priority ON intentions(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_intentions_user_target_date ON intentions(user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_intentions_user_created ON intentions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_intentions_user_updated ON intentions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_prayer_times_user_date ON prayer_times(user_id, date);
CREATE INDEX IF NOT EXISTS idx_prayer_times_location_date ON prayer_times(latitude, longitude, date);
CREATE INDEX IF NOT EXISTS idx_prayer_times_valid_until ON prayer_times(valid_until);

-- Dhikr table for dhikr counter functionality
CREATE TABLE IF NOT EXISTS dhikr_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  dhikr_type TEXT NOT NULL DEFAULT 'general',
  dhikr_text TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  target_count INTEGER,
  date TEXT NOT NULL, -- ISO date string (YYYY-MM-DD)
  session_start TEXT NOT NULL DEFAULT (datetime('now')), -- ISO datetime string
  session_end TEXT, -- ISO datetime string
  notes TEXT,
  tags TEXT DEFAULT '[]', -- JSON array as TEXT
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dhikr types/categories table
CREATE TABLE IF NOT EXISTS dhikr_types (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  arabic_text TEXT,
  transliteration TEXT,
  translation TEXT,
  description TEXT,
  recommended_count INTEGER,
  tags TEXT DEFAULT '[]', -- JSON array as TEXT
  is_active INTEGER DEFAULT 1 NOT NULL, -- BOOLEAN as INTEGER in SQLite
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dhikr statistics for daily/weekly/monthly aggregation
CREATE TABLE IF NOT EXISTS dhikr_stats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  dhikr_type TEXT NOT NULL,
  period_type TEXT CHECK (period_type IN ('daily', 'weekly', 'monthly')) NOT NULL,
  period_start TEXT NOT NULL, -- ISO date string
  period_end TEXT NOT NULL, -- ISO date string
  total_count INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  average_session_duration INTEGER, -- in seconds
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, dhikr_type, period_type, period_start)
);

-- Indexes for dhikr tables
CREATE INDEX IF NOT EXISTS idx_dhikr_sessions_user ON dhikr_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dhikr_sessions_user_date ON dhikr_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_dhikr_sessions_user_type ON dhikr_sessions(user_id, dhikr_type);
CREATE INDEX IF NOT EXISTS idx_dhikr_sessions_date ON dhikr_sessions(date);
CREATE INDEX IF NOT EXISTS idx_dhikr_types_active ON dhikr_types(is_active);
CREATE INDEX IF NOT EXISTS idx_dhikr_stats_user ON dhikr_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_dhikr_stats_user_period ON dhikr_stats(user_id, period_type, period_start);

-- Onboarding table for progressive data collection
CREATE TABLE IF NOT EXISTS onboarding (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_step TEXT NOT NULL DEFAULT 'welcome',
  completed_steps TEXT DEFAULT '[]', -- JSON array of completed step names
  profile_completion_percentage INTEGER DEFAULT 0 CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100),
  data_collected TEXT DEFAULT '{}', -- JSON object with collected onboarding data
  language_selected TEXT,
  location_set INTEGER DEFAULT 0, -- BOOLEAN as INTEGER
  prayer_calculation_method_set INTEGER DEFAULT 0, -- BOOLEAN as INTEGER
  notifications_configured INTEGER DEFAULT 0, -- BOOLEAN as INTEGER
  privacy_preferences_set INTEGER DEFAULT 0, -- BOOLEAN as INTEGER
  display_preferences_set INTEGER DEFAULT 0, -- BOOLEAN as INTEGER
  is_completed INTEGER DEFAULT 0 NOT NULL, -- BOOLEAN as INTEGER
  skipped_steps TEXT DEFAULT '[]', -- JSON array of skipped step names
  completion_date TEXT, -- ISO datetime string when onboarding was completed
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for onboarding table
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_step ON onboarding(current_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding(is_completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_completion_percentage ON onboarding(profile_completion_percentage);