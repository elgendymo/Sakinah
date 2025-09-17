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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_user_status ON plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_user_created ON journals(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_content_snippets_type ON content_snippets(type);